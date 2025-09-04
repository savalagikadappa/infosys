const { ExamAllocation } = require('../models/ExamAllocation');
const ExaminerAvailability = require('../models/ExaminerAvailability');
const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');
const logger = require('../utils/logger').child('EXAM');
const debugEnabled = () => (process.env.EXAM_FORCE_DEBUG === 'true' || process.env.EXAM_DEBUG === 'true') && process.env.EXAM_QUIET !== 'true' && process.env.QUIET !== 'true';
const debug = (...args) => { if (debugEnabled()) logger.debug(...args); };

// In-memory cache for availability dates (basic; invalidated every CACHE_TTL_MS)
let availabilityCache = { dates: null, ts: 0 };
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// Utility: normalize date (UTC midnight)
function normalize(dateInput) {
  const d = new Date(dateInput);
  d.setUTCHours(0,0,0,0);
  return d;
}

// GET /api/exams/available-dates
// Returns list of ISO dates (yyyy-mm-dd) where at least one examiner has availability
exports.getAvailableDates = async (req, res) => {
  try {
  let uniqueDates;
  const now = Date.now();
  if (availabilityCache.dates && (now - availabilityCache.ts) < CACHE_TTL_MS) {
    uniqueDates = availabilityCache.dates;
    debug('Phase A cache hit', uniqueDates.length);
  } else {
    const avail = await ExaminerAvailability.find({}).select('date -_id');
    debug('Phase A availability count', avail.length);
    uniqueDates = [ ...new Set(avail.map(a => a.date.toISOString().slice(0,10))) ].sort();
    availabilityCache = { dates: uniqueDates, ts: now };
    debug('Phase B cache store', uniqueDates.length);
  }

    // Optional filtering: /api/exams/available-dates?eligibleOnly=true
    // NOTE: Revised logic: we no longer hide availability based on eligibility.
    // Candidates can pre-book an exam date at any time provided the chosen exam date occurs AFTER their 4th session date.
    // So even with eligibleOnly=true we now just return all availability; frontend will validate per-selection.
    if (req.query.eligibleOnly === 'true' && req.user?.role === 'candidate') {
  debug('Phase C eligibleOnly passthrough', uniqueDates.length);
  return res.json(uniqueDates);
    }

    // Default: return all examiner availability dates
  debug('Phase D returning dates', uniqueDates.length);
  res.json(uniqueDates);
  } catch (err) {
  debug('Error getAvailableDates', err.message);
  res.status(500).json({ message: 'Error fetching available dates', error: err.message });
  }
};

// Helper to ensure we can derive candidate's enrolled record
function getCandidateEnrollment(session, userId) {
  return (session.enrolledStudents || []).find(es => es.user && es.user.toString() === userId.toString());
}

// Compute last (4th) session date for enrollment; if missing nextSessionDates, infer forward from enrolledAt + weekly increments to reach 4 dates aligned to dayOfWeek
function computeLastSessionDate(session, enrollment) {
  if (enrollment.nextSessionDates && enrollment.nextSessionDates.length >= 4) {
    const d = new Date(enrollment.nextSessionDates[3]);
  debug('Phase E stored fourth date', session._id.toString(), d.toISOString());
    return d;
  }
  // Fallback generation
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const targetDay = dayNames.indexOf(session.dayOfWeek);
  if (targetDay === -1) return null;
  const dates = [];
  const start = new Date(enrollment.enrolledAt);
  start.setHours(0,0,0,0);
  start.setDate(start.getDate() + (targetDay - start.getDay() + 7) % 7);
  for (let i=0;i<4;i++) {
    dates.push(new Date(start.getTime() + i*7*86400000));
  }
  debug('Phase F predicted fourth date', session._id.toString(), dates[3].toISOString());
  return dates[3];
}

// GET /api/exams/eligible-sessions?date=YYYY-MM-DD
// Sessions for which candidate completed 4 weeks strictly before chosen date & no existing exam allocation yet
exports.getEligibleSessions = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date is required' });
    const examDate = normalize(date);
    const candidate = req.user.userId;

    const sessions = await TrainingSession.find({ 'enrolledStudents.user': candidate })
      .populate('enrolledStudents.user', 'email');

    const allocations = await ExamAllocation.find({ candidate }).select('session');
    const allocatedSessionIds = new Set(allocations.map(a => a.session.toString()));

  debug('Phase G eligibility start', examDate.toISOString().slice(0,10), 'sessions', sessions.length);
    const eligible = [];
    for (const session of sessions) {
      const sid = session._id.toString();
      const enrollment = getCandidateEnrollment(session, candidate);
  if (!enrollment) { debug('G1 skip no enrollment', sid); continue; }
      const last = computeLastSessionDate(session, enrollment);
  if (!last) { debug('G2 skip no last date', sid); continue; }
      const lastNorm = normalize(last);
  if (examDate <= lastNorm) { debug('G3 skip exam<=4th', sid, lastNorm.toISOString().slice(0,10)); continue; }
  if (allocatedSessionIds.has(sid)) { debug('G4 skip allocated', sid); continue; }
      eligible.push({
        _id: session._id,
        title: session.title,
        dayOfWeek: session.dayOfWeek,
        lastSessionDate: lastNorm.toISOString().slice(0,10)
      });
  debug('G5 eligible', sid, lastNorm.toISOString().slice(0,10));
    }
  debug('G6 eligible total', eligible.length);
    res.json(eligible);
  } catch (err) {
  debug('Error getEligibleSessions', err.message);
    res.status(500).json({ message: 'Error fetching eligible sessions', error: err.message });
  }
};

// POST /api/exams/schedule { date, sessionId }
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
    const last = computeLastSessionDate(session, enrollment);
    if (!last) return res.status(400).json({ message: 'Could not determine training completion' });
    const lastNorm = normalize(last);
  debug('Phase H schedule attempt', sessionId, examDate.toISOString().slice(0,10), lastNorm.toISOString().slice(0,10));
    if (examDate <= lastNorm) {
  debug('H1 reject exam<=4th');
      return res.status(400).json({ message: 'Chosen exam date must be after the projected 4th training session date (' + lastNorm.toISOString().slice(0,10) + ')'});
    }

    const existing = await ExamAllocation.findOne({ candidate, session: sessionId });
    if (existing) return res.status(400).json({ message: 'Exam already scheduled for this session' });

    // Find available examiners that day
  const examinerAvail = await ExaminerAvailability.find({ date: examDate });
  debug('H2 examiner availability count', examinerAvail.length);
  if (examinerAvail.length === 0) return res.status(400).json({ message: 'No examiner available on this date' });

    // Build load map
    const examinerIds = examinerAvail.map(a => a.examiner.toString());
    const loads = await ExamAllocation.aggregate([
      { $match: { examiner: { $in: examinerAvail.map(a => a.examiner) }, date: examDate } },
      { $group: { _id: '$examiner', count: { $sum: 1 } } }
    ]);
    const loadMap = Object.fromEntries(loads.map(l => [l._id.toString(), l.count]));
    examinerIds.sort((a,b) => (loadMap[a]||0) - (loadMap[b]||0));
    const chosenExaminer = examinerIds[0];

    const allocation = new ExamAllocation({ examiner: chosenExaminer, candidate, date: examDate, session: sessionId });
    await allocation.save();
    await allocation.populate('examiner','email');
    await allocation.populate('session','title');
  debug('H3 scheduled allocation', allocation._id.toString());
  res.status(201).json({ message: 'Exam scheduled', allocation });
  } catch (err) {
  debug('Error scheduleExam', err.message);
  res.status(500).json({ message: 'Error scheduling exam', error: err.message });
  }
};
