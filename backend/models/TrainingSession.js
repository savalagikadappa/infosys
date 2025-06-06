const mongoose = require('mongoose');

const VALID_MODES = ['online', 'offline'];
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const trainingSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  mode: { 
    type: String, 
    required: true, 
    validate: {
      validator: function(value) {
        return VALID_MODES.includes(value);
      },
      message: props => `${props.value} is not a valid mode!`
    }
  },
  zoomLink: { type: String },
  location: { type: String },
  isLive: { type: Boolean, default: false },
  dayOfWeek: { 
    type: String, 
    required: true, 
    validate: {
      validator: function(value) {
        return VALID_DAYS.includes(value);
      },
      message: props => `${props.value} is not a valid day of the week!`
    }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrolledStudents: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledAt: { type: Date, required: true },
    nextSessionDates: [{ type: Date }]
  }]
}, { timestamps: true });

module.exports = mongoose.model('TrainingSession', trainingSessionSchema);
