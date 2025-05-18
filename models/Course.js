const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  youtubeLink: {
    type: String,
    required: true,
    match: [/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/, 'Invalid YouTube URL']
  },
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  category: {
    type: String,
    required: true,
    enum: [
      'Technology',
      'Science & Math',
      'Business',
      'Arts & Humanities',
      'Health & Lifestyle',
      'Education',
      'Language',
      'Other'
    ],
    default: 'Other'
  },
  lectures: [lectureSchema],
  createdAt: { type: Date, default: Date.now },
});

courseSchema.index({ title: 1 });
courseSchema.index({ description: 1 });

module.exports = mongoose.model('Course', courseSchema);