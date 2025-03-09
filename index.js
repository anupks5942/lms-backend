const morgan = require('morgan');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const assignmentRoutes = require('./routes/assignments');
const gradeRoutes = require('./routes/grades');
const quizRoutes = require('./routes/quizzes');
const adminRoutes = require('./routes/admin');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/assignments', assignmentRoutes);
app.use('/grades', gradeRoutes);
app.use('/quizzes', quizRoutes); 
app.use('/admin', adminRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));