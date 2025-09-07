const { ExamAllocation } = require('../models/ExamAllocation');
const ExaminerAvailability = require('../models/ExaminerAvailability');
const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');

// Utility: normalize date (UTC midnight)
function normalize(dateInput) {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Helper: find this candidate's enrollment record in a session
function getCandidateEnrollment(session, userId) {
  console.log('\n');
  console.log(session.enrolledStudents + " " + userId)
  console.log('\n');

  const uid = userId?.toString();
  return (session.enrolledStudents || []).find(es => {
    if (!es.user) return false;
    // Handle both populated doc (has _id) and raw ObjectId
    const id = es.user._id ? es.user._id : es.user;
    return id && id.toString() === uid;
  });
}

// Helper: get the LAST training date.
// Prefer enrollment.nextSessionDates; if missing, derive the next 4 weekly dates from enrolledAt + session dayOfWeek.
function getLastTrainingDateFromArray(enrollment, sessionDayOfWeek) {
  if (Array.isArray(enrollment.nextSessionDates) && enrollment.nextSessionDates.length > 0) {
    const sorted = enrollment.nextSessionDates
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    return sorted[sorted.length - 1];
  }

  // Fallback computation if nextSessionDates wasn't populated
  if (!enrollment.enrolledAt || !sessionDayOfWeek) return null;
  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  const targetDay = dayMap[sessionDayOfWeek];
  if (typeof targetDay !== 'number') return null;

  const start = new Date(enrollment.enrolledAt);
  // advance to next occurrence of the session day
  const d = new Date(start);
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1);
  }
  // 4 weekly occurrences; return the 4th
  d.setDate(d.getDate() + 7 * 3);
  return d;
}

// GET /api/exams/available-dates
// Returns list of ISO dates (yyyy-mm-dd) where at least one examiner has availability
exports.getAvailableDates = async (req, res) => {
  try {
    // Fetch all availability
    const avail = await ExaminerAvailability.find({}).select('examiner date');
    if (avail.length === 0) return res.json([]);

    // Group availability by dateKey
    const byDate = new Map(); // dateKey -> [{examiner, date}]
    const dateKeys = new Set();
    for (const a of avail) {
      const key = a.date.toISOString().slice(0, 10);
      dateKeys.add(key);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push({ examiner: a.examiner?.toString(), date: a.date });
    }

    // Load existing allocations for those dates (exact match on normalized dates)
    const dateObjs = Array.from(dateKeys).map(k => new Date(k + 'T00:00:00.000Z'));
    const allocations = await ExamAllocation.find({ date: { $in: dateObjs } }).select('examiner date');
    const allocatedSet = new Set(allocations.map(al => `${al.examiner.toString()}|${al.date.toISOString().slice(0, 10)}`));

    // A date is available if there exists at least one examiner with availability and no allocation on that date
    const result = [];
    for (const key of Array.from(dateKeys).sort()) {
      const slots = byDate.get(key) || [];
      const hasFreeExaminer = slots.some(s => !allocatedSet.has(`${s.examiner}|${key}`));
      if (hasFreeExaminer) result.push(key);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching available dates', error: err.message });
  }
};

// GET /api/exams/eligible-sessions?date=YYYY-MM-DD
// For the chosen date: sessions where last(nextSessionDates) < chosen date and candidate has no exam yet
exports.getEligibleSessions = async (req, res) => {

  try {
    const { date } = req.query;
    console.log(date + "from examcontroller")
    if (!date) return res.status(400).json({ message: 'date is required' });
    const examDate = normalize(date);
    const candidate = req.user.userId;

    const sessions = await TrainingSession.find({ 'enrolledStudents.user': candidate })
      .select('title dayOfWeek enrolledStudents')
      .populate('enrolledStudents.user', 'email');

    console.log(sessions)
    // console.log(candidate)
    const allocations = await ExamAllocation.find({ candidate }).select('session');
    const allocatedSessionIds = new Set(allocations.map(a => a.session.toString()));

    console.log(allocations)

    const eligible = [];
    for (const session of sessions) {
      const enrollment = getCandidateEnrollment(session, candidate);
      console.log(enrollment+" this is enrollment \n");
      console.log(session.enrolledStudents)
      if (!enrollment) continue;
      const last = getLastTrainingDateFromArray(enrollment, session.dayOfWeek);
      console.log(last + "last dates are ")
      if (!last) continue; // no defined training dates -> can't be eligible
      const lastNorm = normalize(last);
      if (examDate <= lastNorm) continue; // must be strictly after the last training date
      if (allocatedSessionIds.has(session._id.toString())) continue; // already scheduled
      eligible.push({
        _id: session._id,
        title: session.title,
        dayOfWeek: session.dayOfWeek,
        lastSessionDate: lastNorm.toISOString().slice(0, 10)
      });
    }

    return res.json(eligible);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching eligible sessions', error: err.message });
  }
};

// POST /api/exams/schedule { date, sessionId }
// Schedule an exam for the given session on the given date if available and valid
exports.scheduleExam = async (req, res) => {
  try {
    const { date, sessionId } = req.body;
    if (!date || !sessionId) return res.status(400).json({ message: 'date and sessionId are required' });
    const examDate = normalize(date);
    const candidate = req.user.userId;

    const session = await TrainingSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const enrollment = getCandidateEnrollment(session, candidate);
    if (!enrollment) return res.status(403).json({ message: 'Not enrolled in this session' });

    const last = getLastTrainingDateFromArray(enrollment, session.dayOfWeek);
    if (!last) return res.status(400).json({ message: 'No training dates defined for this session enrollment' });
    const lastNorm = normalize(last);
    if (examDate <= lastNorm) {
      return res.status(400).json({ message: 'Exam date must be after your last training date (' + lastNorm.toISOString().slice(0, 10) + ')' });
    }

  const existing = await ExamAllocation.findOne({ candidate, session: sessionId });
    if (existing) return res.status(400).json({ message: 'Exam already scheduled for this session' });

  // Prevent the candidate from booking multiple exams on the same date
  const candidateSameDay = await ExamAllocation.findOne({ candidate, date: examDate });
  if (candidateSameDay) return res.status(400).json({ message: 'You already have an exam on this date' });

    // Ensure examiner availability exists for this date (tolerate time components)
    const dayStart = new Date(examDate);
    const dayEnd = new Date(examDate);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const examinerAvail = await ExaminerAvailability.find({ date: { $gte: dayStart, $lt: dayEnd } });
    if (examinerAvail.length === 0) return res.status(400).json({ message: 'No examiner available on this date' });

  // Enforce capacity: one exam per examiner per day. Filter to examiners with zero allocations that date
  const examinerIds = examinerAvail.map(a => a.examiner);
  const busy = await ExamAllocation.find({ examiner: { $in: examinerIds }, date: examDate }).select('examiner');
  const busySet = new Set(busy.map(b => b.examiner.toString()));
  const freeExaminers = examinerIds.map(id => id.toString()).filter(id => !busySet.has(id));
  if (freeExaminers.length === 0) return res.status(400).json({ message: 'All examiners are fully booked on this date' });
  const chosenExaminer = freeExaminers[0];

    const allocation = new ExamAllocation({ examiner: chosenExaminer, candidate, date: examDate, session: sessionId });
    await allocation.save();
    await allocation.populate('examiner', 'email');
    await allocation.populate('session', 'title');

    return res.status(201).json({ message: 'Exam scheduled', allocation });
  } catch (err) {
    return res.status(500).json({ message: 'Error scheduling exam', error: err.message });
  }
};
