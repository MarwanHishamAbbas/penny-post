import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'path';

// Determine application stage
process.env.APP_STAGE = process.env.APP_STAGE || 'development';

const isProduction = process.env.APP_STAGE === 'production';
const isDevelopment = process.env.APP_STAGE === 'development';
const isTest = process.env.APP_STAGE === 'test';

// Load .env files based on environment
if (isDevelopment) {
  config(); // Loads .env
} else if (isTest) {
  config({ path: resolve(process.cwd(), '.env.test') }); // Loads .env.test
}

// Define validation schema with Zod
const envSchema = z.object({
  APP_STAGE: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Server configuration
  PORT: z.coerce.number().positive().default(3001),
  HOST: z.string().default('localhost'),

  // Database
  POSTGRES_HOST: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_PORT: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRY: z.string().default('1h'),
  REFRESH_TOKEN_EXPIRY: z.string().default('1w'),
  // DATABASE_URL: z.string().startsWith('postgresql://'),
  // DATABASE_POOL_MIN: z.coerce.number().min(0).default(2),
  // DATABASE_POOL_MAX: z.coerce.number().positive().default(10),

  // JWT & Authentication
  // JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // JWT_EXPIRES_IN: z.string().default('7d'),
  // REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
  // REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Security
  // BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),

  // CORS configuration
  CORS_ORIGIN: z
    .string()
    .or(z.array(z.string()))
    .transform((val) => {
      if (typeof val === 'string') {
        return val.split(',').map((origin) => origin.trim());
      }
      return val;
    })
    .default([]),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default(isProduction ? 'info' : 'debug'),
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  const formatted = z.treeifyError(parsed.error);
  console.error(formatted.properties);
  throw new Error('Invalid environment variables');
}

// Type inference from schema
export type Env = z.infer<typeof envSchema>;

// Export validated env
export const env = parsed.data;
