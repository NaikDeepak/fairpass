import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Use vercel-postgres driver which reads POSTGRES_URL from env automatically
export const db = drizzle(sql, { schema });
