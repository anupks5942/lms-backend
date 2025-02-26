const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload'); // Add this line
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');

const router = express.Router();

// Upload Assignment (Teacher only)
router.post('/:courseId', auth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  const { title, description, dueDate } = req.body;
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }
    const existingAssignment = await Assignment.findOne({
      title,
      course: req.params.courseId,
    });
    if (existingAssignment) {
      return res.status(400).json({ message: 'Assignment with this title already exists for this course' });
    }
    const assignment = new Assignment({
      title,
      description,
      course: req.params.courseId,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
      dueDate,
    });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit Assignment (Student only)
router.post('/:id/submit', auth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.submittedBy.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already submitted' });
    }
    assignment.submittedBy.push(req.user.id);
    await assignment.save();
    res.json({ message: 'Assignment submitted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Download Assignment
router.get('/:id/download', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || !assignment.fileUrl) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.download(`.${assignment.fileUrl}`);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;