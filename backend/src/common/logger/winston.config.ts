import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, json, errors, printf } = winston.format;

// Custom format for development (more readable)
const devFormat = printf(({ level, message, timestamp, context, trace, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]`;
  if (context) {
    log += ` [${context}]`;
  }
  log += `: ${message}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  if (trace) {
    log += `\n${trace}`;
  }
  return log;
});

// Production format (JSON for log aggregation systems)
const prodFormat = combine(
  timestamp({ format: 'ISO' }),
  errors({ stack: true }),
  json(),
);

// Development format (human readable)
const developmentFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  devFormat,
);

export const winstonConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : developmentFormat,
  defaultMeta: {
    service: 'partner-collaboration-platform',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport (always active)
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    // File transport for errors (production only)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
          }),
        ]
      : []),
  ],
  exitOnError: false,
};

// Export winston instance for direct usage
export const logger = winston.createLogger(winstonConfig);

// Logger interface for type safety
export interface LogContext {
  context?: string;
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

export class WinstonLogger {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  error(message: string, trace?: string, meta?: LogContext): void {
    logger.error(message, { ...meta, context: this.context, trace });
  }

  warn(message: string, meta?: LogContext): void {
    logger.warn(message, { ...meta, context: this.context });
  }

  info(message: string, meta?: LogContext): void {
    logger.info(message, { ...meta, context: this.context });
  }

  debug(message: string, meta?: LogContext): void {
    logger.debug(message, { ...meta, context: this.context });
  }

  setContext(context: string): void {
    this.context = context;
  }
}
