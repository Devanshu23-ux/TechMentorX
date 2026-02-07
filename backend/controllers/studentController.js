const Student = require('../models/Student');
const User = require('../models/User');
const { StudentComment, StudentScore, StudentWellbeing, StudentAttendance, AiAnalysis } = require('../models/StudentData');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getAllStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .populate('user', 'fullName email') // Populate user details
            .sort({ createdAt: -1 });

        // For each student, we might want to attach their latest sediment/analysis or just return the list
        // To match the dashboard "Flagged Students" list, we need to know if they are flagged and maybe their latest sentiment.

        // Detailed population might be expensive for a long list, but for now it's fine.
        const populatedStudents = await Promise.all(students.map(async (student) => {
            const formatting = student.toObject();
            const analysis = await AiAnalysis.findOne({ student: student._id }).sort({ createdAt: -1 });
            const comments = await StudentComment.find({ student: student._id }).sort({ createdAt: -1 }).limit(1);

            return {
                ...formatting,
                profiles: formatting.user, // Map to match Supabase structure slightly for easier frontend migration
                ai_analyses: analysis ? [analysis] : [],
                student_comments: comments
            };
        }));

        res.json(populatedStudents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).populate('user', 'fullName email');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const comments = await StudentComment.find({ student: student._id }).sort({ createdAt: -1 });
        const scores = await StudentScore.find({ student: student._id }).sort({ assessmentDate: -1 });
        const wellbeing = await StudentWellbeing.find({ student: student._id }).sort({ recordedDate: -1 });
        const attendance = await StudentAttendance.find({ student: student._id }).sort({ date: -1 });
        const analysis = await AiAnalysis.find({ student: student._id }).sort({ createdAt: -1 });

        res.json({
            ...student.toObject(),
            profiles: student.user,
            student_comments: comments,
            student_scores: scores,
            student_wellbeing: wellbeing,
            student_attendance: attendance,
            ai_analyses: analysis
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Dashboard Data
// @route   GET /api/students/dashboard
// @access  Private
exports.getDashboardData = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const flaggedCount = await Student.countDocuments({ isFlagged: true });

        // Avg Sentiment
        const analyses = await AiAnalysis.find({ sentimentScore: { $ne: null } }).select('sentimentScore');
        const avgSentiment = analyses.length > 0
            ? Math.round(analyses.reduce((acc, curr) => acc + curr.sentimentScore, 0) / analyses.length)
            : 0;

        // Engagement Rate (Attendance)
        const attendance = await StudentAttendance.find().select('status');
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const engagementRate = attendance.length > 0
            ? Math.round((presentCount / attendance.length) * 100)
            : 0;

        // Scatter Data (Top 50 students)
        const students = await Student.find().limit(50).populate('user', 'fullName');
        const scatterData = await Promise.all(students.map(async (s) => {
            const wellbeing = await StudentWellbeing.findOne({ student: s._id }).sort({ recordedDate: -1 });
            const analysis = await AiAnalysis.findOne({ student: s._id }).sort({ createdAt: -1 });

            let sentiment = 'neutral';
            const score = analysis?.sentimentScore || 50;
            if (score < 40) sentiment = 'frustrated';
            else if (score > 70) sentiment = 'motivated';

            return {
                name: s.user?.fullName || 'Unknown',
                totalScore: (s.gpa || 0) * 25,
                stressLevel: wellbeing?.stressLevel || 5,
                sentiment
            };
        }));

        res.json({
            kpiData: {
                totalStudents,
                avgSentiment,
                highRiskAlerts: flaggedCount,
                engagementRate
            },
            scatterData
        });

    } catch (error) {
        console.error('Dashboard Data Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current student profile
// @route   GET /api/students/me
// @access  Private
exports.getStudentProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const student = await Student.findOne({ user: userId });

        if (!student) {
            // If student not found, maybe they are just a user but haven't been created as student record yet
            // return empty or specific code
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const attendance = await StudentAttendance.find({ student: student._id });
        const wellbeing = await StudentWellbeing.findOne({ student: student._id }).sort({ recordedDate: -1 });
        const analysis = await AiAnalysis.findOne({ student: student._id }).sort({ createdAt: -1 });
        const scores = await StudentScore.find({ student: student._id }).sort({ assessmentDate: 1 }).limit(10);

        res.json({
            student: student,
            attendance,
            latestWellbeing: wellbeing,
            latestAnalysis: analysis,
            scores
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
