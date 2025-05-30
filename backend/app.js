// API: Initialize Express app and setup routes
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/drone')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const authRoutes = require('./routes/auth');
const trainingSessionRoutes = require('./routes/trainingSession');
const examinerRoutes = require('./routes/examiner');
app.use('/api/auth', authRoutes);
app.use('/api/sessions', trainingSessionRoutes);
app.use('/api/examiner', examinerRoutes);

server.listen(5000, () => console.log('Server listening on port 5000'));