import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';

import { getDb } from './db/database';
import { invoicesRoute } from './routes/invoices';
import { milestonesRoute } from './routes/milestones';
import { protectionRoute } from './routes/protection';
import { overviewRoute } from './routes/overview';
import { paypalRoute } from './routes/paypal';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Ensure SQLite DB is initialized and seeded on boot
getDb();

// Health Check Endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: 'PayPulse Hono Server v3',
  });
});

// Mount Routes for All 5 Dedicated Workflows & PayPal Integration
app.route('/api/overview', overviewRoute);
app.route('/api/invoices', invoicesRoute);
app.route('/api/milestones', milestonesRoute);
app.route('/api/protection', protectionRoute);
app.route('/api/paypal', paypalRoute);

// Global Error Handler
app.onError((err, c) => {
  console.error('Server Unhandled Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
  }, 500);
});

// Start Server
const port = Number(process.env.PORT) || 3001;

console.log(`PayPulse Hono backend booting on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});