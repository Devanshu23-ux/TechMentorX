const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentNumber: {
        type: String,
        unique: true
    },
    department: {
        type: String // Simplified for now, can be Ref to Department model
    },
    enrollmentDate: {
        type: Date
    },
    gpa: {
        type: Number,
        default: 0
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Student', studentSchema);
