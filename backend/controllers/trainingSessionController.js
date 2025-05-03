const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');

// Create a new training session (Trainer only)
exports.createSession = async (req, res) => {
  try {
    const { title, description, mode, zoomLink, location, isLive, dayOfWeek } = req.body;
    const createdBy = req.user.userId;

    // Removed conflict detection by date

    const session = new TrainingSession({
      title,
      description,
      mode,
      zoomLink: mode === 'online' ? zoomLink : undefined,
      location: mode === 'offline' ? location : undefined,
      isLive,
      dayOfWeek,
      createdBy,
    });
    await session.save();
    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Error creating session', error: err });
  }
};

// List sessions created by the trainer
exports.getMySessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({ createdBy: req.user.userId })
      .populate('enrolledStudents', 'email')
      .sort({ createdAt: 1 }); // Sort by creation time
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions', error: err });
  }
};

// Enroll a student in a session
exports.enrollInSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.userId;
    const session = await TrainingSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    // Prevent double enrollment
    if (session.enrolledStudents.includes(userId)) {
      return res.status(400).json({ message: 'Already enrolled' });
    }
    // Removed conflict detection by date
    session.enrolledStudents.push(userId);
    await session.save();
    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error enrolling', error: err });
  }
};

// List all available sessions for students
exports.getAvailableSessions = async (req, res) => {
  try {
    // Only return sessions where the candidate is NOT already enrolled
    const sessions = await TrainingSession.find({
      enrolledStudents: { $ne: req.user.userId }
    }).populate('createdBy', 'email');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions', error: err });
  }
};

// List sessions a student is enrolled in
exports.getMyEnrolledSessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({ enrolledStudents: req.user.userId })
      .populate('createdBy', 'email')
      .sort({ createdAt: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching enrolled sessions', error: err });
  }
};

// Get calendar data for a user (trainer or student)
exports.getCalendar = async (req, res) => {
  try {
    let sessions;
    if (req.user.role === 'trainer') {
      sessions = await TrainingSession.find({ createdBy: req.user.userId });
    } else if (req.user.role === 'candidate') {
      sessions = await TrainingSession.find({ enrolledStudents: req.user.userId });
    } else {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(sessions.map(s => ({ isLive: s.isLive }))); // No date
  } catch (err) {
    res.status(500).json({ message: 'Error fetching calendar', error: err });
  }
};

// Examiner: List all sessions
exports.getAllSessions = async (req, res) => {
  try {
    if (req.user.role !== 'examiner') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const sessions = await TrainingSession.find({}).populate('createdBy', 'email role').populate('enrolledStudents', 'email');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all sessions', error: err });
  }
};

// Examiner: Reschedule (reallocate) a session
exports.rescheduleSession = async (req, res) => {
  try {
    if (req.user.role !== 'examiner') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const { sessionId } = req.body;
    const session = await TrainingSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    // Removed conflict detection by date
    // No date to update
    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.json({ message: 'Session rescheduled successfully', session });
  } catch (err) {
    res.status(500).json({ message: 'Error rescheduling session', error: err });
  }
};

// Examiner: Check-in/check-out for a session
exports.checkInOut = async (req, res) => {
  try {
    if (req.user.role !== 'examiner') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const { sessionId, action } = req.body; // action: 'checkin' or 'checkout'
    const session = await TrainingSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (!session.examinerStatus) session.examinerStatus = {};
    session.examinerStatus[req.user.userId] = action === 'checkin' ? 'checked-in' : 'checked-out';
    await session.save();
    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.json({ message: `Examiner ${action} successful`, status: session.examinerStatus[req.user.userId] });
  } catch (err) {
    res.status(500).json({ message: 'Error in check-in/out', error: err });
  }
};

// Examiner: Get calendar of all sessions
exports.getExaminerCalendar = async (req, res) => {
  try {
    if (req.user.role !== 'examiner') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const sessions = await TrainingSession.find({});
    res.json(sessions.map(s => ({ isLive: s.isLive, title: s.title, trainer: s.createdBy })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching examiner calendar', error: err });
  }
};
