const express = require('express');
const router = express.Router();
const trainingSessionController = require('../controllers/trainingSessionController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Trainer: create session
router.post('/create', trainingSessionController.createSession);
// Trainer: get my sessions
router.get('/my-sessions', trainingSessionController.getMySessions);
// Student: enroll in session
router.post('/enroll/:id', trainingSessionController.enrollInSession);
// Student: get available sessions
router.get('/available', trainingSessionController.getAvailableSessions);
// Student: get my enrolled sessions
router.get('/enrolled', trainingSessionController.getMyEnrolledSessions);
// Trainer/Student: get calendar data
router.get('/calendar', trainingSessionController.getCalendar);

// Examiner: get all sessions
router.get('/all', trainingSessionController.getAllSessions);
// Examiner: reschedule session
router.post('/reschedule', trainingSessionController.rescheduleSession);
// Examiner: check-in/check-out
router.post('/checkinout', trainingSessionController.checkInOut);
// Examiner: get calendar
router.get('/examiner-calendar', trainingSessionController.getExaminerCalendar);

module.exports = router;
