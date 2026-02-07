const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scholarguard')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        console.log('Please check your MONGO_URI in backend/.env');
    });

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
    res.send('ScholarGuard API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
