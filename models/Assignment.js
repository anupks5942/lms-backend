const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  fileUrl: { type: String }, // URL to uploaded file
  submittedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Students who submitted
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Assignment', assignmentSchema);