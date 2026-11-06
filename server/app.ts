import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { bodyLimit } from 'hono/body-limit';
import 'dotenv/config';

import { getDb } from './db/database';
import { invoicesRoute } from './routes/invoices';
import { milestonesRoute } from './routes/milestones';
import { protectionRoute } from './routes/protection';
import { overviewRoute } from './routes/overview';
import { paypalRoute } from './routes/paypal';
import { settingsRoute } from './routes/settings';
import { scanRoute } from './routes/scan';
import { agentsRoute } from './routes/agents';

export const app = new Hono();

// Global Middlewares (15MB body limit for high-res document uploads)
app.use('*', logger());
app.use('*', bodyLimit({ maxSize: 15 * 1024 * 1024 }));
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

// Mount Routes for All Dedicated Workflows, Settings, Vision & Autonomous Agents
app.route('/api/overview', overviewRoute);
app.route('/api/invoices', invoicesRoute);
app.route('/api/milestones', milestonesRoute);
app.route('/api/protection', protectionRoute);
app.route('/api/paypal', paypalRoute);
app.route('/api/settings', settingsRoute);
app.route('/api/scan', scanRoute);
app.route('/api/agents', agentsRoute);

// Global Error Handler
app.onError((err, c) => {
  console.error('Server Unhandled Error:', err);
  return c.json({
    success: false,
    error: err.message || 'Internal Server Error',
  }, 500);
});