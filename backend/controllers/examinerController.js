const { ExaminerAvailability, ExamAllocation } = require('../models/ExamAllocation');
const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');

// Examiner sets their available dates
exports.setAvailability = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const { availableDates } = req.body; // Array of ISO date strings
    let record = await ExaminerAvailability.findOne({ examiner });
    if (!record) {
      record = new ExaminerAvailability({ examiner, availableDates });
    } else {
      record.availableDates = availableDates;
    }
    await record.save();
    res.json({ message: 'Availability updated', availableDates });
  } catch (err) {
    res.status(500).json({ message: 'Error updating availability', error: err });
  }
};

// Examiner gets their availability
exports.getAvailability = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const record = await ExaminerAvailability.findOne({ examiner });
    res.json(record ? record.availableDates : []);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching availability', error: err });
  }
};

// Examiner/Frontend: Get calendar data (training sessions, exams, availability)
exports.getExaminerCalendar = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const availability = await ExaminerAvailability.findOne({ examiner });
    const allocations = await ExamAllocation.find({ examiner })
      .populate('candidate', 'email')
      .sort({ date: 1 });
    // Get all training sessions for all candidates
    const sessions = await TrainingSession.find({})
      .populate('enrolledStudents', 'email')
      .populate('createdBy', 'email');
    res.json({ availability: availability ? availability.availableDates : [], allocations, sessions });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching calendar', error: err });
  }
};

// Allocate exam to a candidate on a selected date (called when examiner selects a date)
exports.allocateExam = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const { date } = req.body; // ISO date string
    const examDate = new Date(date);
    // Find all sessions and all existing exam allocations for this date
    const allSessions = await TrainingSession.find({})
      .populate('enrolledStudents', 'email');
    const existingExams = await ExamAllocation.find({ date: examDate });
    // Find candidates who have completed training before this date and have no exam on this date or for this session
    const candidates = [];
    for (const session of allSessions) {
      // Use session.createdAt as the start date for this session
      const startDate = new Date(session.createdAt);
      const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
      const targetDay = dayMap[session.dayOfWeek];
      if (targetDay === undefined) continue;
      // Find the first occurrence of the session's dayOfWeek on or after createdAt
      let firstSession = new Date(startDate);
      while (firstSession.getDay() !== targetDay) {
        firstSession.setDate(firstSession.getDate() + 1);
      }
      const lastSession = new Date(firstSession);
      lastSession.setDate(lastSession.getDate() + 7 * 3); // 4th week
      for (const candidate of session.enrolledStudents) {
        // Check if candidate finished training before exam date
        if (examDate <= lastSession) continue;
        // Check for exam conflict: already has exam for this session or on this date
        const hasExamConflict = await ExamAllocation.findOne({
          candidate: candidate._id,
          $or: [
            { date: examDate },
            { session: session._id }
          ]
        });
        if (hasExamConflict) continue;
        if (existingExams.some(e => e.candidate.toString() === candidate._id.toString())) continue;
        candidates.push({ candidate: candidate._id, session: session._id, enrolledDate: firstSession });
      }
    }
    if (candidates.length === 0) {
      return res.status(400).json({ message: 'No candidates eligible for exam on this date' });
    }
    // Allocate to the candidate who enrolled earliest
    candidates.sort((a, b) => a.enrolledDate - b.enrolledDate);
    const allocated = new ExamAllocation({ examiner, candidate: candidates[0].candidate, session: candidates[0].session, date: examDate });
    await allocated.save();
    res.json({ message: 'Exam allocated', allocation: allocated });
  } catch (err) {
    res.status(500).json({ message: 'Error allocating exam', error: err });
  }
};

// Get all exam allocations for a candidate (for candidate dashboard)
exports.getCandidateExams = async (req, res) => {
  try {
    const candidate = req.user.userId;
    const exams = await ExamAllocation.find({ candidate })
      .populate('examiner', 'email')
      .populate('session')
      .sort({ date: 1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching exams', error: err });
  }
};

// Get all exam allocations for a date (for examiner/candidate day details)
exports.getExamsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    const exams = await ExamAllocation.find({ date: new Date(date) })
      .populate('examiner', 'email')
      .populate('candidate', 'email')
      .populate('session');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching exams for date', error: err });
  }
};
