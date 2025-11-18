import winston from 'winston';
import { env } from '@/config/env';

// Determine environment
const isProduction = env.APP_STAGE === 'production';
const isTest = env.APP_STAGE === 'test';

// Simple console format with colors for development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  }),
);

// JSON format for production (easier to parse in log aggregators)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create the logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      silent: isTest, // No logs during tests
    }),
  ],
  exitOnError: false,
});

export default logger;
