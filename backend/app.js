const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io); // Make io accessible in controllers
app.use(cors());

// Middleware
app.use(express.json()); // parse JSON requests

// Connect to your local MongoDB
mongoose.connect('mongodb://localhost:27017/drone')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Auth routes
const authRoutes = require('./routes/auth');
const trainingSessionRoutes = require('./routes/trainingSession');
const examinerRoutes = require('./routes/examiner');
app.use('/api/auth', authRoutes);
app.use('/api/sessions', trainingSessionRoutes);
app.use('/api/examiner', examinerRoutes);

server.listen(5000, () => console.log('Server listening on port 5000'));