const mongoose = require('mongoose');

// Store individual available dates for an examiner. Use unique compound index to avoid duplicates.
const examinerAvailabilitySchema = new mongoose.Schema({
  examiner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true }
}, { timestamps: true });

examinerAvailabilitySchema.index({ examiner: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ExaminerAvailability', examinerAvailabilitySchema);
