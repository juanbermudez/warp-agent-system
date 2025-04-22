// src/utils/logger.ts
import winston from 'winston';
import { config } from '../config.js';

// Create a custom logger
export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'warp-agent-system' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport if configured
    ...(config.logging.file
      ? [
          new winston.transports.File({
            filename: config.logging.file,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
          }),
        ]
      : []),
  ],
});
