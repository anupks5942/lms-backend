const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  questions: [{
    questionText: { type: String, required: true },
    type: { type: String, enum: ['multiple-choice'], default: 'multiple-choice' },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  attemptedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Quiz', quizSchema);