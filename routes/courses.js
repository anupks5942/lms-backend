const express = require('express');
const auth = require('../middleware/auth');
const Course = require('../models/Course');

const router = express.Router();

// Create Course (Teacher/Admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  const { title, description } = req.body;
  try {
    const course = new Course({ title, description, teacher: req.user.id });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get All Courses
router.get('/', auth, async (req, res) => {
  try {
    const courses = await Course.find().populate('teacher', 'name');
    res.json({ courses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Enroll in Course (Student only)
router.post('/:id/enroll', auth, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.students.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already enrolled' });
    }
    course.students.push(req.user.id);
    await course.save();
    res.json({ message: 'Enrolled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;