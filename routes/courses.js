const express = require('express');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');

// Create Course (Teacher/Admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  const { title, description, category, lectures } = req.body;
  try {
    const course = new Course({
      title,
      description,
      category,
      lectures,
      teacher: req.user.id,
    });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get All Courses
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching all courses for user:', req.user.id);
    const courses = await Course.find()
      .select('title description category teacher students createdAt')
      .populate('teacher', 'name')
      .populate('students', '_id name email')
      .lean();
    console.log(`Found ${courses.length} courses`);
    res.json({ courses });
  } catch (err) {
    console.error('Error fetching all courses:', err);
    res.status(500).json({ message: err.message });
  }
});

// Filter/Search Courses
router.get('/filter', auth, async (req, res) => {
  try {
    const { category, query } = req.query;
    console.log('Filtering courses:', { category, query, userId: req.user.id });

    const validCategories = [
      'Technology',
      'Science & Math',
      'Business',
      'Arts & Humanities',
      'Health & Lifestyle',
      'Education',
      'Language',
      'Other'
    ];

    // Validate category if provided
    if (category && !validCategories.includes(category)) {
      console.log('Invalid category provided:', category);
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Build query
    const filter = {};
    if (category) {
      filter.category = category;
    }

    if (query && typeof query === 'string' && query.trim().length > 0) {
      const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(sanitizedQuery, 'i');
      filter.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
      ];
    } else if (query) {
      console.log('Invalid query provided:', query);
      return res.status(400).json({ message: 'Search query is required' });
    }

    const courses = await Course.find(filter)
      .select('title description category teacher students createdAt')
      .populate('teacher', 'name')
      .populate('students', '_id name email')
      .lean();
    console.log(`Found ${courses.length} courses with filter`);
    res.json({ courses });
  } catch (err) {
    console.error('Error filtering courses:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get Course by ID
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('Fetching course ID:', req.params.id);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid course ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(req.params.id)
      .select('title description category teacher lectures students createdAt')
      .populate('teacher', 'name')
      .populate('students', '_id name email')
      .lean();
    if (!course) {
      console.log('Course not found:', req.params.id);
      return res.status(404).json({ message: 'Course not found' });
    }
    const isEnrolled = course.students.some(student => student._id.equals(req.user._id));
    console.log('Course fetched, isEnrolled:', isEnrolled);
    res.json({ course, isEnrolled });
  } catch (err) {
    console.error('Error fetching course by ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get Course by Student ID
router.get('/student/:id', auth, async (req, res) => {
  try {
    console.log('Fetching courses for student ID:', req.params.id);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid student ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    const courses = await Course.find({ students: req.params.id })
      .select('title description category teacher students createdAt')
      .populate('teacher', 'name')
      .populate('students', '_id name email')
      .lean();
    console.log(`Found ${courses.length} courses for student`);
    res.json({ courses });
  } catch (err) {
    console.error('Error fetching courses by student ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get Course by Teacher ID
router.get('/teacher/:id', auth, async (req, res) => {
  try {
    console.log('Fetching courses for teacher ID:', req.params.id);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('Invalid teacher ID:', req.params.id);
      return res.status(400).json({ message: 'Invalid teacher ID' });
    }
    const courses = await Course.find({ teacher: req.params.id })
      .select('title description category teacher students createdAt')
      .populate('teacher', 'name')
      .populate('students', '_id name email')
      .lean();
    console.log(`Found ${courses.length} courses for teacher`);
    res.json({ courses });
  } catch (err) {
    console.error('Error fetching courses by teacher ID:', err);
    res.status(500).json({ message: err.message });
  }
});

// Enroll in Course (Student only)
router.put('/:id/enroll', auth, async (req, res) => {
  if (req.user.role !== 'student') {
    console.log('Access denied: Non-student tried to enroll');
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const courseId = req.params.id;
    const userId = req.user._id;

    console.log(`Enrollment attempt: user=${userId}, course=${courseId}`);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log('Invalid course ID:', courseId);
      return res.status(400).json({ message: 'Invalid course ID' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      console.log('Course not found:', courseId);
      return res.status(404).json({ message: 'Course not found' });
    }

    const alreadyEnrolled = course.students.some(studentId => studentId && studentId.equals(req.user._id));
    if (alreadyEnrolled) {
      console.log('User already enrolled:', userId);
      return res.status(400).json({ message: 'Already enrolled' });
    }

    console.log('Enrolling user into course...');
    course.students.push(userId);
    await course.save();
    console.log('Course updated with new student.');

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    user.enrolledCourses = user.enrolledCourses || [];
    const alreadyInUser = user.enrolledCourses.some(courseIdInUser => courseIdInUser.equals(courseId));
    if (!alreadyInUser) {
      user.enrolledCourses.push(courseId);
      await user.save();
      console.log('User updated with new enrolled course.');
    }

    console.log('Enrollment successful');
    res.json({ message: 'Enrolled successfully' });

  } catch (err) {
    console.error('Enrollment error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get lectures of a Course (Teacher/Admin/Student)
router.get('/:id/lectures', auth, async (req, res) => {
  try {
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }

    // Fetch course with minimal fields
    const course = await Course.findById(req.params.id)
      .select('lectures teacher students')
      .lean();

    // Check if course exists
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Access control
    const isStudent = req.user.role === 'student';
    const isTeacher = req.user.role === 'teacher';
    const isAdmin = req.user.role === 'admin';

    if (isStudent && !course.students.some(studentId => studentId.equals(req.user._id))) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
    if (isTeacher && course.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view lectures for this course' });
    }
    if (!isStudent && !isTeacher && !isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Return lectures
    res.json({ lectures: course.lectures });
  } catch (err) {
    console.error('Error fetching lectures:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload lecture (Teacher/Admin only)
router.post('/:id/lectures', auth, async (req, res) => {
  try {
    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }

    // Validate input
    const { title, description, youtubeLink } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: 'Lecture title is required' });
    }
    if (!youtubeLink || typeof youtubeLink !== 'string' || !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(youtubeLink)) {
      return res.status(400).json({ message: 'Valid YouTube URL is required' });
    }
    if (description && typeof description !== 'string') {
      return res.status(400).json({ message: 'Description must be a string' });
    }

    // Fetch course
    const course = await Course.findById(req.params.id).select('teacher');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Access control
    if (req.user.role !== 'admin' && course.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add lectures to this course' });
    }

    // Create lecture
    const newLecture = { title: title.trim(), description: description?.trim(), youtubeLink };
    
    // Add lecture to course
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: req.params.id },
      { $push: { lectures: newLecture } },
      { new: true, runValidators: true }
    ).select('lectures');

    if (!updatedCourse) {
      return res.status(500).json({ message: 'Failed to add lecture' });
    }

    // Return the added lecture
    const addedLecture = updatedCourse.lectures[updatedCourse.lectures.length - 1];
    res.status(201).json({ message: 'Lecture added successfully', lecture: addedLecture });
  } catch (err) {
    console.error('Error adding lecture:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;