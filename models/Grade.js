const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }, // Optional
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }, // Optional
  score: { type: Number, required: true },
  feedback: { type: String },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional
  createdAt: { type: Date, default: Date.now },
}, {
  // Ensure at least one of assignment or quiz is provided
  validate: {
    validator: function (v) {
      return this.assignment || this.quiz;
    },
    message: 'Either an assignment or a quiz must be specified.',
  },
});

module.exports = mongoose.model('Grade', gradeSchema);