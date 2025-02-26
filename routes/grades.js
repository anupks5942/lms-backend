const express = require('express');
const auth = require('../middleware/auth');
const Grade = require('../models/Grade');
const Assignment = require('../models/Assignment');

const router = express.Router();

// Add Grade (Teacher only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  const { student, assignment, score, feedback } = req.body;
  try {
    const assign = await Assignment.findById(assignment).populate('course');
    if (!assign || !assign.course || assign.course.teacher.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Assignment not found or unauthorized' });
    }
    const grade = new Grade({ student, assignment, score, feedback, gradedBy: req.user.id });
    await grade.save();
    res.status(201).json(grade);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get Student Progress
router.get('/student/:id', auth, async (req, res) => {
  try {
    const grades = await Grade.find({ student: req.params.id })
      .populate('assignment', 'title')
      .populate('gradedBy', 'name');
    res.json(grades);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;