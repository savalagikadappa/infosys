const express = require('express');
const protect = require('../middleware/authMiddleware');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', protect, authController.me);


module.exports = router;