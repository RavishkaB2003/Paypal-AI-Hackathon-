import { serve } from '@hono/node-server';
import 'dotenv/config';
import { app } from './app';

const port = Number(process.env.PORT) || 3001;

console.log(`PayPulse Hono backend booting on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});