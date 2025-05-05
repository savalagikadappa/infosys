const express = require('express');
const router = express.Router();
const examinerController = require('../controllers/examinerController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Examiner sets and gets their availability
router.post('/availability', examinerController.setAvailability);
router.get('/availability', examinerController.getAvailability);

// Examiner calendar data (sessions, exams, availability)
router.get('/calendar', examinerController.getExaminerCalendar);

// Examiner allocates exam on a date
router.post('/allocate-exam', examinerController.allocateExam);

// Candidate gets their exam allocations
router.get('/candidate-exams', examinerController.getCandidateExams);

// Get all exam allocations for a specific date
router.get('/exams-by-date', examinerController.getExamsByDate);

module.exports = router;
