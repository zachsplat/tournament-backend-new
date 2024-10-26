// src/utils/logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;
const DailyRotateFile = require('winston-daily-rotate-file');

// Define custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Create logger
const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }), // Capture stack trace
    logFormat
  ),
  defaultMeta: { service: 'tournament-service' },
  transports: [
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

// If not in production, log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      format.colorize(),
      format.simple()
    ),
  }));
}

module.exports = logger;


