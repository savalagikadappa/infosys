const { ExamAllocation } = require('../models/ExamAllocation');
const ExaminerAvailability = require('../models/ExaminerAvailability');
const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');

// API: Examiner toggle availability for a single date
exports.toggleAvailability = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const { date } = req.body; // ISO date string
    if (!date) return res.status(400).json({ message: 'date is required' });
    const d = new Date(date);
    if (isNaN(d)) return res.status(400).json({ message: 'Invalid date format' });
    // Truncate time to 00:00:00 for consistency (UTC)
    d.setUTCHours(0,0,0,0);
    const existing = await ExaminerAvailability.findOne({ examiner, date: d });
    if (existing) {
      await existing.deleteOne();
      return res.json({ message: 'Availability removed', date: d, available: false });
    } else {
      await ExaminerAvailability.create({ examiner, date: d });
      return res.json({ message: 'Availability added', date: d, available: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error toggling availability', error: err.message });
  }
};

// API: Examiner gets their availability (list of dates)
exports.getAvailability = async (req, res) => {
  try {
    const examiner = req.user.userId;
    const records = await ExaminerAvailability.find({ examiner });
    res.json(records.map(r => r.date));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching availability', error: err.message });
  }
};

// API: Examiner/Frontend: Get calendar data
exports.getExaminerCalendar = async (req, res) => {
  try {
    const examiner = req.user.userId;
  const availabilityRecords = await ExaminerAvailability.find({ examiner });
    const allocations = await ExamAllocation.find({ examiner })
      .populate('candidate', 'email')
      .sort({ date: 1 });
    const sessions = await TrainingSession.find({})
      .populate('enrolledStudents', 'email')
      .populate('createdBy', 'email');
  res.json({ availability: availabilityRecords.map(r => r.date), allocations, sessions });
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
