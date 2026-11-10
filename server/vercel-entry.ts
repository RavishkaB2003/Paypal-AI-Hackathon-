import { handle } from '@hono/node-server/vercel';
import { app } from './app';
import { getDb, seedDatabaseIfEmpty } from './db/database';

const honoHandler = handle(app);

export default async function vercelHandler(req: any, res: any) {
  // Guarantee SQLite schema and seed data exist before handling any request
  const db = getDb();
  seedDatabaseIfEmpty(db);

  // Ensure req.url always preserves the /api prefix when routed via vercel.json rewrite
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return honoHandler(req, res);
}
