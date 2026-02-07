const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    comment: { type: String, required: true },
    commentType: { type: String, default: 'general' }, // academic, behavioral, etc
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const scoreSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    subject: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, default: 100 },
    assessmentType: { type: String }, // mid-term, final, quiz
    assessmentDate: { type: Date, default: Date.now }
});

const wellbeingSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    mood: { type: String },
    stressLevel: { type: Number, min: 1, max: 10 },
    sleepHours: { type: Number },
    notes: { type: String },
    recordedDate: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' },
    notes: { type: String }
});

const aiAnalysisSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    sentimentScore: { type: Number },
    moodClassification: { type: String },
    topicGaps: [{ type: String }],
    interventionPlan: { type: mongoose.Schema.Types.Mixed }, // JSON object
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    StudentComment: mongoose.model('StudentComment', commentSchema),
    StudentScore: mongoose.model('StudentScore', scoreSchema),
    StudentWellbeing: mongoose.model('StudentWellbeing', wellbeingSchema),
    StudentAttendance: mongoose.model('StudentAttendance', attendanceSchema),
    AiAnalysis: mongoose.model('AiAnalysis', aiAnalysisSchema)
};
