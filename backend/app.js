// API: Initialize Express app and setup routes
// Use quiet mode for dotenv if QUIET env var is true
require('dotenv').config({ quiet: process.env.QUIET === 'true' });
const logger = require('./utils/logger').child('CORE');
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

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/drone';
mongoose.connect(MONGO_URI)
  .then(() => { logger.info('MongoDB connected'); })
  .catch(err => { logger.error('Mongo connection error', err.message); });

const authRoutes = require('./routes/auth');
const trainingSessionRoutes = require('./routes/trainingSession');
const examinerRoutes = require('./routes/examiner');
const examRoutes = require('./routes/exams');
app.use('/api/auth', authRoutes);
app.use('/api/sessions', trainingSessionRoutes);
app.use('/api/examiner', examinerRoutes);
app.use('/api/exams', examRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { logger.info(`Server listening on port ${PORT}`); });

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.warn('Shutting down...');
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});