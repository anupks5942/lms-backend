const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  questions: [{
    questionText: { type: String, required: true },
    type: { type: String, enum: ['multiple-choice'], default: 'multiple-choice' }, // Only multiple-choice allowed
    options: [{ type: String, required: true }], // Required options
    correctAnswer: { type: String, required: true } // Required for auto-grading
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Teacher
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quiz', quizSchema);