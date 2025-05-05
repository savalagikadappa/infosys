const mongoose = require('mongoose');

const examAllocationSchema = new mongoose.Schema({
  examiner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['allocated', 'completed'], default: 'allocated' },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingSession', required: true }
}, { timestamps: true });

const examinerAvailabilitySchema = new mongoose.Schema({
  examiner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  availableDates: [{ type: Date, required: true }]
}, { timestamps: true });

module.exports = {
  ExamAllocation: mongoose.model('ExamAllocation', examAllocationSchema),
  ExaminerAvailability: mongoose.model('ExaminerAvailability', examinerAvailabilitySchema)
};