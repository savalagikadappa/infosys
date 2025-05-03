const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
app.use(cors());

// Middleware
app.use(express.json()); // parse JSON requests

// Connect to your local MongoDB
mongoose.connect('mongodb://localhost:27017/drone', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.listen(5000, () => console.log('Server listening on port 5000'));