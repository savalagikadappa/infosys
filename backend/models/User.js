const mongoose = require('mongoose');

const VALID_ROLES = ['candidate', 'examiner', 'trainer', 'coordinator'];

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        required: true, 
        validate: {
            validator: function(value) {
                return VALID_ROLES.includes(value);
            },
            message: props => `${props.value} is not a valid role!`
        }
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);