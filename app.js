const express = require('express');
const app = express();
const cors = require('cors');
const sequelize = require('./config/database');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');

// Security Middleware
app.use(helmet()); 
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS Configuration
const productionOrigins = [
  'https://tournament-frontend-beryl.vercel.app'
  // Add any other production origins here
];

const developmentOrigins = ['http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? productionOrigins 
      : developmentOrigins;

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// Define a Root Route
app.get('/', (req, res) => {
  res.send('Welcome to the Tournament App API');
});

// Health check endpoint (useful for Railway)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const bracketRoutes = require('./routes/bracketRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/profiles/:profileId/tickets', ticketRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/admin/checkin', checkinRoutes);
app.use('/api/admin/users', adminUserRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Handling Middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// Export app without calling sequelize.sync()
module.exports = app;

