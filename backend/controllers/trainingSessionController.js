const TrainingSession = require('../models/TrainingSession');
const User = require('../models/User');

// API: Create a new training session
exports.createSession = async (req, res) => {
  try {
    const { title, description, mode, zoomLink, location, isLive, dayOfWeek } = req.body;
    const createdBy = req.user.userId;

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
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: 'Error creating session', error: err });
  }
};

// API: List sessions created by the trainer
exports.getMySessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({ createdBy: req.user.userId })
      .populate('enrolledStudents', 'email')
      .sort({ createdAt: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions', error: err });
  }
};

// API: Enroll a student in a session
exports.enrollInSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.userId;
    const session = await TrainingSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (session.enrolledStudents.some(e => e.user.toString() === userId)) {
      return res.status(400).json({ message: 'Already enrolled' });
    }

    const conflict = await TrainingSession.findOne({
      'enrolledStudents.user': userId,
      dayOfWeek: session.dayOfWeek
    });
    if (conflict) {
      return res.status(400).json({ message: `You already have a session on ${session.dayOfWeek} and can't book another on the same day.` });
    }

    const systemDate = new Date();
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[session.dayOfWeek];
    const dates = [];
    let date = new Date(systemDate);

    while (date.getDay() !== targetDay) {
      date.setDate(date.getDate() + 1);
    }

    for (let i = 0; i < 4; i++) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 7);
    }

    session.enrolledStudents.push({
      user: userId,
      enrolledAt: systemDate,
      nextSessionDates: dates 
    });
    await session.save();

    const io = req.app.get('io');
    if (io) io.emit('session-updated');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sendEmail = require('../utils/emailService');
    const emailSubject = `Enrollment Confirmation for ${session.title}`;
    const emailBody = `You have successfully enrolled in the session "${session.title}". The next four session dates are: ${dates.map(date => date.toDateString()).join(', ')}.`;

    try {
      await sendEmail(user.email, emailSubject, emailBody);
      console.log('Enrollment email sent successfully');
    } catch (emailError) {
      console.error('Error sending enrollment email:', emailError);
    }

    res.json({ message: 'Enrolled successfully', bookedDates: dates });
  } catch (err) {
    res.status(500).json({ message: 'Error enrolling', error: err });
  }
};

// API: List all available sessions for students
exports.getAvailableSessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({
      'enrolledStudents.user': { $ne: req.user.userId }
    }).populate('createdBy', 'email').populate('enrolledStudents.user', 'email');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions', error: err });
  }
};

// API: List sessions a student is enrolled in
exports.getMyEnrolledSessions = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({ 'enrolledStudents.user': req.user.userId })
      .populate('createdBy', 'email')
      .populate('enrolledStudents.user', 'email')
      .sort({ createdAt: 1 });

    const sessionsWithBookedDates = sessions.map(session => {
      const enrolledStudent = session.enrolledStudents.find(e => e.user.toString() === req.user.userId);
      return {
        ...session.toObject(),
        bookedDates: enrolledStudent ? enrolledStudent.bookedDates : []
      };
    });

    res.json(sessionsWithBookedDates);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching enrolled sessions', error: err });
  }
};

// API: Get calendar data for a user (trainer or student)
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

// API: Delete a session (Trainer only)
exports.deleteSession = async (req, res) => {
  try {
    const session = await TrainingSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await session.deleteOne();
    const io = req.app.get('io');
    if (io) io.emit('session-updated');
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting session', error: err });
  }
};

// API: Fetch all session dates for highlighting
exports.getHighlightDates = async (req, res) => {
  try {
    const sessions = await TrainingSession.find({}, 'nextSessionDates title');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching highlight dates', error: err });
  }
};

// API: Ensure all sessions have nextSessionDates populated
exports.ensureNextSessionDates = async () => {
  try {
    const sessions = await TrainingSession.find({ nextSessionDates: { $exists: false } });
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };

    for (const session of sessions) {
      const targetDay = dayMap[session.dayOfWeek];
      const dates = [];
      let date = new Date();

      while (date.getDay() !== targetDay) {
        date.setDate(date.getDate() + 1);
      }

      for (let i = 0; i < 4; i++) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 7);
      }

      session.nextSessionDates = dates;
      await session.save();
    }
  } catch (err) {
    console.error('Error ensuring nextSessionDates:', err);
  }
};
