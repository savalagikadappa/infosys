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
    if (session.enrolledStudents.some(e => e.user.toString() === userId)) {
      return res.status(400).json({ message: 'Already enrolled' });
    }
    // Conflict detection by dayOfWeek
    const conflict = await TrainingSession.findOne({
      'enrolledStudents.user': userId,
      dayOfWeek: session.dayOfWeek
    });
    if (conflict) {
      return res.status(400).json({ message: `You already have a session on ${session.dayOfWeek} and can't book another on the same day.` });
    }
    session.enrolledStudents.push({ user: userId, enrolledAt: new Date() });
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
      'enrolledStudents.user': { $ne: req.user.userId }
    }).populate('createdBy', 'email').populate('enrolledStudents.user', 'email');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions', error: err });
  }
};

// List sessions a student is enrolled in
exports.getMyEnrolledSessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({ 'enrolledStudents.user': req.user.userId })
      .populate('createdBy', 'email')
      .populate('enrolledStudents.user', 'email')
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

// Delete a session (Trainer only)
exports.deleteSession = async (req, res) => {
  try {
    const session = await TrainingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await session.deleteOne();
    // Emit real-time update
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting session', error: err });
  }
};
