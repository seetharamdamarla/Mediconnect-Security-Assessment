const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileSetupRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const drugRoutes = require('./routes/drugRoutes');
const activityRoutes = require('./routes/activityRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aptRoutes = require('./routes/appointmentRoutes');
const aiRoutes = require('./routes/aiRoutes');

const { AppError, ValidationError, NotFoundError } = require('./utils/errors');

const app = express();
app.use(helmet());
app.use(hpp());

const FRONTEND = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: FRONTEND,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/user', userRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/appointments', aptRoutes);
app.use('/api/ai', aiRoutes);

app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
});

app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({ errors: err.errors });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
