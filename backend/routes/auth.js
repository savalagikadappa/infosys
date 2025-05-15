const express = require('express');
const { getUserProfile } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Removed the '/profile' route as it is no longer needed.

module.exports = router;