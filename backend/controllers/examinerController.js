const { ExaminerAvailability, ExamAllocation } = require('../models/ExamAllocation');
const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');

// API: Examiner sets their available dates
exports.setAvailability = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const { availableDates } = req.body; 
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

// API: Examiner gets their availability
exports.getAvailability = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const record = await ExaminerAvailability.findOne({ examiner });
    res.json(record ? record.availableDates : []);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching availability', error: err });
  }
};

// API: Examiner/Frontend: Get calendar data
exports.getExaminerCalendar = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const availability = await ExaminerAvailability.findOne({ examiner });
    const allocations = await ExamAllocation.find({ examiner })
      .populate('candidate', 'email')
      .sort({ date: 1 });
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
    const { date } = req.body;
    const examDate = new Date(date);
    const allSessions = await TrainingSession.find({})
      .populate('enrolledStudents', 'email');
    const existingExams = await ExamAllocation.find({ date: examDate });
    const candidates = [];
    for (const session of allSessions) {
      const startDate = new Date(session.createdAt);
      const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
      const targetDay = dayMap[session.dayOfWeek];
      if (targetDay === undefined) continue;
      let firstSession = new Date(startDate);
      while (firstSession.getDay() !== targetDay) {
        firstSession.setDate(firstSession.getDate() + 1);
      }
      const lastSession = new Date(firstSession);
      lastSession.setDate(lastSession.getDate() + 7 * 3); 
      for (const candidate of session.enrolledStudents) {
        if (examDate <= lastSession) continue;
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
