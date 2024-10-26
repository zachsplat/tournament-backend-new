const dotenv = require('dotenv');
const env = process.env.NODE_ENV || 'development';

// Load environment variables based on NODE_ENV
if (env !== 'production') { // Only load .env files in non-production
  dotenv.config({
    path: `.env.${env}`
  });
}

const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Sync database and start server
async function startServer() {
  try {
    // In production, you might want to disable auto-sync
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
      console.log('Database synced successfully');
    }

    app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

