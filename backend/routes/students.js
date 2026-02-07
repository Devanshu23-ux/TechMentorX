const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// router.get('/', studentController.getAllStudents);
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, studentController.getDashboardData);
router.get('/me', protect, studentController.getStudentProfile);
router.get('/', protect, studentController.getAllStudents);
router.get('/:id', protect, studentController.getStudentById);

module.exports = router;
