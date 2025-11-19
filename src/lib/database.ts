import { env } from '@/config/env';
import pg from 'pg';

export const pool = new pg.Pool({
  user: env.POSTGRES_USER,
  host: env.POSTGRES_HOST,
  database: env.POSTGRES_DB,
  password: env.POSTGRES_PASSWORD,
  port: Number(env.POSTGRES_PORT),
});
