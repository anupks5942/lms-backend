const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    questionIndex: { type: Number, required: true },
    answer: { type: String, required: true }
  }],
  score: { type: Number, required: true }, // Always set upon submission
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);