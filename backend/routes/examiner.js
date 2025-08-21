const express = require('express');
const router = express.Router();
const examinerController = require('../controllers/examinerController');
const authMiddleware = require('../middleware/authMiddleware');
const { getUserById } = require('../controllers/userController');

// All routes require authentication
router.use(authMiddleware);

// Examiner availability: toggle and fetch
router.post('/availability/toggle', examinerController.toggleAvailability);
router.get('/availability', examinerController.getAvailability);

// Examiner calendar data (sessions, exams, availability)
router.get('/calendar', examinerController.getExaminerCalendar);

// Examiner allocates exam on a date
router.post('/allocate-exam', examinerController.allocateExam);

// Candidate gets their exam allocations
router.get('/candidate-exams', examinerController.getCandidateExams);

// Get all exam allocations for a specific date
router.get('/exams-by-date', examinerController.getExamsByDate);

// Route to fetch user by ID
router.get('/users/:id', getUserById);

module.exports = router;
