import * as dotenv from 'dotenv';
dotenv.config();

function required(key: string, fallback?: string): string {
  const val = process.env[key];
  if (!val) {
    if (fallback !== undefined) {
      console.warn(`[env] Notice: "${key}" is not set in environment or .env. Using fallback.`);
      return fallback;
    }
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'multitech-access-default-secret-change-in-prod'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'multitech-refresh-default-secret-change-in-prod'),
  JWT_EXAM_SECRET: required('JWT_EXAM_SECRET', 'multitech-exam-default-secret-change-in-prod'),
  SSO_JWT_SECRET: required('SSO_JWT_SECRET', 'multitech-sso-default-secret-change-in-prod'),
  SEB_CONFIG_KEY: optional('SEB_CONFIG_KEY', 'NONE'),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5173'),
  UPLOAD_DIR: optional('UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: parseInt(optional('MAX_FILE_SIZE_MB', '50'), 10),
  COOKIE_DOMAIN: optional('COOKIE_DOMAIN', 'localhost'),
  GOOGLE_OAUTH_CLIENT_ID: optional('GOOGLE_OAUTH_CLIENT_ID', ''),
  GOOGLE_OAUTH_CLIENT_SECRET: optional('GOOGLE_OAUTH_CLIENT_SECRET', ''),
  GOOGLE_OAUTH_REDIRECT_URI: optional('GOOGLE_OAUTH_REDIRECT_URI', ''),
  ERP_WEBHOOK_URL: optional('ERP_WEBHOOK_URL', ''),
  ERP_WEBHOOK_SECRET: optional('ERP_WEBHOOK_SECRET', ''),
  isProd: optional('NODE_ENV', 'development') === 'production',
} as const;
