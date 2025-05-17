const express = require('express');
const auth = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const Course = require('../models/Course');
const Grade = require('../models/Grade');
const mongoose = require('mongoose');
const router = express.Router();

// Create Quiz (Teacher only)
router.post('/:courseId', auth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  const { title, description, questions, dueDate } = req.body;
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course || course.teacher.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Course not found or unauthorized' });
    }
    const quiz = new Quiz({
      title,
      description,
      course: req.params.courseId,
      questions,
      createdBy: req.user.id,
      dueDate,
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Quizzes for a Course
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    // Validate courseId format
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid course ID format' });
    }

    // Check if course exists and user has access
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Verify user's access to the course
    if (req.user.role === 'student' && !course.students.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Get all quizzes for the course
    const quizzes = await Quiz.find({ course: req.params.courseId })
      .populate('course', 'title')
      .populate('createdBy', 'name')
      .lean();

    res.json({ quizzes });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching quizzes: ' + err.message });
  }
});

// Submit Quiz Answers and Auto-Grade (Student only)
router.post('/:quizId/submit', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

  const { answers } = req.body;
  const userId = req.user.id;

  try {
    const quiz = await Quiz.findById(req.params.quizId).populate('course');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (!quiz.course.students.includes(userId)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    if (quiz.attemptedBy.includes(userId)) {
      return res.status(400).json({ message: 'Already attempted' });
    }

    let score = 0;
    const totalQuestions = quiz.questions.length;
    const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;

    answers.forEach((answer, index) => {
      const question = quiz.questions[index];
      if (question && question.correctAnswer === answer) {
        score += pointsPerQuestion;
      }
    });
    score = Math.round(score);

    quiz.attemptedBy.push(userId);
    await quiz.save();

    res.status(201).json({ message: 'Quiz submitted successfully', score });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Student Quiz Submissions (For progress tracking)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const submissions = await QuizSubmission.find({ student: req.params.studentId })
      .populate('quiz', 'title');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;