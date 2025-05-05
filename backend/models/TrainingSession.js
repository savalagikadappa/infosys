const mongoose = require('mongoose');

const trainingSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  mode: { type: String, enum: ['online', 'offline'], required: true },
  zoomLink: { type: String },
  location: { type: String },
  isLive: { type: Boolean, default: false },
  dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrolledStudents: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledAt: { type: Date, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('TrainingSession', trainingSessionSchema);
