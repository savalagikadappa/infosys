const mongoose = require('mongoose');

const VALID_STATUSES = ['allocated', 'completed'];

const examAllocationSchema = new mongoose.Schema({
  examiner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  status: { 
    type: String, 
    default: 'allocated', 
    validate: {
      validator: function(value) {
        return VALID_STATUSES.includes(value);
      },
      message: props => `${props.value} is not a valid status!`
    }
  },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingSession', required: true }
}, { timestamps: true });

module.exports = {
  ExamAllocation: mongoose.model('ExamAllocation', examAllocationSchema)
};