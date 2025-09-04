const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const examController = require('../controllers/examController');
const logger = require('../utils/logger').child('EXAMREQ');

// All exam-related endpoints require auth (candidate role mostly, but we keep generic)
router.use(auth);

// Conditional lightweight request logger (only when LOG_LEVEL=debug and not suppressed)
router.use((req, _res, next) => {
	const quietEnv = process.env.QUIET === 'true' || process.env.EXAM_QUIET === 'true';
	const suppressed = quietEnv || req.query.quiet === 'true' || req.headers['x-quiet'] === 'true' || req.body?.quiet === true || process.env.EXAM_REQUEST_LOG === 'false';
	if (!suppressed && (process.env.LOG_LEVEL === 'debug')) {
		logger.debug(req.method, req.originalUrl);
	}
	if (req.query.debug === '1') {
		process.env.EXAM_DEBUG = 'true';
		if (!suppressed) logger.debug('Per-request debug enabled');
	}
	next();
});

router.get('/available-dates', examController.getAvailableDates);
router.get('/eligible-sessions', examController.getEligibleSessions);
router.post('/schedule', examController.scheduleExam);

module.exports = router;
