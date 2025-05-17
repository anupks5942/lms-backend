const express = require('express');
const auth = require('../middleware/auth');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
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
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }

    const course = await Course.findById(req.params.courseId).select('students teacher');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Restrict access: Students must be enrolled, teachers must own the course, admins have full access
    if (
      req.user.role === 'student' &&
      !course.students.some(studentId => studentId.equals(req.user._id))
    ) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
    if (
      req.user.role === 'teacher' &&
      course.teacher.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to view quizzes for this course' });
    }

    // Fetch quizzes, exclude sensitive fields for students
    const selectFields = req.user.role === 'student'
      ? 'title description course dueDate createdBy createdAt' // Exclude questions
      : 'title description course questions dueDate createdBy createdAt'; // Include all for teachers/admins

    const quizzes = await Quiz.find({ course: req.params.courseId })
      .select(selectFields)
      .populate('createdBy', 'name')
      .lean();

    // For students, add submission status
    if (req.user.role === 'student') {
      const submissions = await QuizSubmission.find({
        student: req.user._id,
        quiz: { $in: quizzes.map(q => q._id) },
      }).select('quiz');

      const submittedQuizIds = new Set(submissions.map(s => s.quiz.toString()));
      quizzes.forEach(quiz => {
        quiz.hasSubmitted = submittedQuizIds.has(quiz._id.toString());
      });
    }

    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit Quiz Answers and Auto-Grade (Student only)
router.post('/:quizId/submit', auth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
  const { answers } = req.body;
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate('course');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!quiz.course.students.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
    const existingSubmission = await QuizSubmission.findOne({ quiz: req.params.quizId, student: req.user.id });
    if (existingSubmission) return res.status(400).json({ message: 'Quiz already submitted' });

    let score = 0;
    const totalQuestions = quiz.questions.length;
    const pointsPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;

    answers.forEach(answer => {
      const question = quiz.questions[answer.questionIndex];
      if (question.correctAnswer === answer.answer) {
        score += pointsPerQuestion;
      }
    });
    score = Math.round(score);

    const submission = new QuizSubmission({
      quiz: req.params.quizId,
      student: req.user.id,
      answers,
      score,
    });
    await submission.save();

    const grade = new Grade({
      student: submission.student,
      quiz: submission.quiz,
      score,
    });
    await grade.save();

    res.status(201).json({ message: 'Quiz submitted and graded', submission });
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