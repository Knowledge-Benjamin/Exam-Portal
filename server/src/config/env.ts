import * as dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_EXAM_SECRET: required('JWT_EXAM_SECRET'),
  SEB_CONFIG_KEY: optional('SEB_CONFIG_KEY', 'NONE'),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),
  UPLOAD_DIR: optional('UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(optional('MAX_FILE_SIZE_MB', '10'), 10),
  COOKIE_DOMAIN: optional('COOKIE_DOMAIN', 'localhost'),
  isProd: optional('NODE_ENV', 'development') === 'production',
} as const;
