import { describe, it, expect } from 'vitest';
import { app } from '../../server/app';

describe('Hono API Routes In-Memory Integration Suite', () => {
  // --------------------------------------------------------------------------
  // 1. Health Endpoint
  // --------------------------------------------------------------------------
  it('GET /api/health - returns server status and version', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.server).toBe('PayPulse Hono Server v3');
    expect(body.timestamp).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // 2. Overview Routes
  // --------------------------------------------------------------------------
  describe('Route Group: /api/overview', () => {
    it('GET /api/overview - returns aggregated dashboard dataset', async () => {
      const res = await app.request('/api/overview');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      const { totalBalanceCents, mainBalanceCents, cashflow, expenses, cards, recentTransactions } = body.data;
      expect(totalBalanceCents).toBeGreaterThan(0);
      expect(mainBalanceCents).toBeGreaterThan(0);
      expect(Array.isArray(cashflow)).toBe(true);
      expect(Array.isArray(expenses)).toBe(true);
      expect(Array.isArray(cards)).toBe(true);
      expect(Array.isArray(recentTransactions)).toBe(true);
    });

    it('GET /api/overview with query params - handles timeframe filters', async () => {
      const res = await app.request('/api/overview?cashflowTimeframe=THIS_QUARTER&expenseTimeframe=QUARTERLY');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('POST /api/overview/deposit - adds funds to ledger and updates balance', async () => {
      const res = await app.request('/api/overview/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: 50000,
          source: 'PayPal Linked Bank',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.totalBalanceCents).toBeDefined();
      expect(body.data.mainBalanceCents).toBeGreaterThan(0);
    });

    it('POST /api/overview/transfer - transfers funds out with positive amount check', async () => {
      const res = await app.request('/api/overview/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: 20000,
          recipient: 'Supplier Co',
          note: 'Material settlement',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Rejection check on non-positive amounts
      const badRes = await app.request('/api/overview/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: -500 }),
      });
      expect(badRes.status).toBe(400);
    });

    it('POST /api/overview/cards - registers a new bank payment card', async () => {
      const res = await app.request('/api/overview/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: 'Silicon Valley Bank',
          network: 'VISA',
          holderName: 'Alex Mercer',
          maskedNumber: '•••• 9988',
          dailyLimit: 30000,
          expiry: '08/29',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.cards).toBeDefined();
      expect(Array.isArray(body.data.cards)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Invoices Routes
  // --------------------------------------------------------------------------
  describe('Route Group: /api/invoices', () => {
    it('GET /api/invoices - retrieves all invoices', async () => {
      const res = await app.request('/api/invoices');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('GET /api/invoices/:id - retrieves a single invoice or returns 404', async () => {
      // Success path using valid seeded invoice id
      const res = await app.request('/api/invoices/inv-1');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('inv-1');

      // 404 Not Found path
      const notFoundRes = await app.request('/api/invoices/inv-does-not-exist');
      expect(notFoundRes.status).toBe(404);
    });

    it('POST /api/invoices - creates a new invoice with 3-step escrow split', async () => {
      const res = await app.request('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: `INV-TEST-${Date.now()}`,
          clientName: 'Design Systems Ltd',
          clientEmail: 'billing@designsys.io',
          amountCents: 100000,
          currency: 'USD',
          enableThreeStepSplit: true,
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.amountCents).toBe(100000);
      expect(body.data.escrowSplit).toBeDefined();
      expect(body.data.escrowSplit.upfrontCents).toBe(30000);
      expect(body.data.escrowSplit.midwayCents).toBe(40000);
      expect(body.data.escrowSplit.finalCents).toBe(30000);

      // Validation path: non-positive amount
      const badRes = await app.request('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: 0 }),
      });
      expect(badRes.status).toBe(400);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Milestones Routes
  // --------------------------------------------------------------------------
  describe('Route Group: /api/milestones', () => {
    it('GET /api/milestones - returns milestone projects with nested tranches', async () => {
      const res = await app.request('/api/milestones');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data[0].tranches).toBeDefined();
    });

    it('POST /api/milestones - creates a milestone project and calculates tranches', async () => {
      const res = await app.request('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Full Stack Integration',
          clientName: 'Acme Corp',
          clientEmail: 'acme@example.com',
          totalCents: 150000,
          currency: 'USD',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('Full Stack Integration');
      expect(body.data.tranches.length).toBe(3);

      // Validation path
      const badRes = await app.request('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalCents: 0 }),
      });
      expect(badRes.status).toBe(400);
    });

    it('POST /api/milestones/:id/release-step - releases next pending tranche and handles errors', async () => {
      // 400 Bad Request for nonexistent project
      const badRes = await app.request('/api/milestones/proj-nonexistent/release-step', {
        method: 'POST',
      });
      expect(badRes.status).toBe(400);

      // Ensure MS-2026-02 has tranche t5 in PENDING_APPROVAL for idempotent test runs
      const { getDb } = await import('../../server/db/database');
      const db = getDb();
      db.prepare("UPDATE milestone_tranches SET status = 'PENDING_APPROVAL' WHERE id = 't5'").run();

      const res = await app.request('/api/milestones/MS-2026-02/release-step', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('MS-2026-02');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Protection Routes
  // --------------------------------------------------------------------------
  describe('Route Group: /api/protection', () => {
    it('GET /api/protection/disputes - lists dispute cases', async () => {
      const res = await app.request('/api/protection/disputes');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('GET /api/protection/delivery - lists shipping proof records', async () => {
      const res = await app.request('/api/protection/delivery');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('POST /api/protection/disputes/:id/evidence - attaches proof hash to dispute', async () => {
      const res = await app.request('/api/protection/disputes/case-1/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceHash: 'manual-proof-sha256-hash-001',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // 404 on nonexistent dispute
      const badRes = await app.request('/api/protection/disputes/case-missing/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceHash: 'proof' }),
      });
      expect(badRes.status).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Settings Routes
  // --------------------------------------------------------------------------
  describe('Route Group: /api/settings', () => {
    it('GET /api/settings - retrieves account settings and notifications', async () => {
      const res = await app.request('/api/settings');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.businessName).toBeDefined();
    });

    it('PUT /api/settings - updates account settings', async () => {
      const res = await app.request('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: 'PayPulse Technologies Inc.',
          autoDefenseEnabled: true,
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.businessName).toBe('PayPulse Technologies Inc.');
    });

    it('GET /api/settings/notifications - retrieves notifications array', async () => {
      const res = await app.request('/api/settings/notifications');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('POST /api/settings/notifications/read-all - marks all notifications read', async () => {
      const res = await app.request('/api/settings/notifications/read-all', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('POST /api/settings/reset-demo - resets demo state idempotently', async () => {
      const res = await app.request('/api/settings/reset-demo', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Multimodal Scan Route
  // --------------------------------------------------------------------------
  describe('Route Group: /api/scan', () => {
    it('POST /api/scan - handles synthetic receipt sample via deterministic fallback', async () => {
      const res = await app.request('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleType: 'receipt',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.totalCents).toBeGreaterThan(0);
      expect(body.data.sha256Hash).toBeDefined();
    });

    it('POST /api/scan - handles synthetic delivery proof sample via deterministic fallback', async () => {
      const res = await app.request('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleType: 'delivery',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.documentType).toBe('PROOF_OF_DELIVERY');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Autonomous Agents Route
  // --------------------------------------------------------------------------
  describe('Route Group: /api/agents', () => {
    it('GET /api/agents/status - retrieves agent engine metrics and audit records', async () => {
      const res = await app.request('/api/agents/status');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ACTIVE');
      expect(Array.isArray(body.data.recentAutonomousActions)).toBe(true);
    });

    it('POST /api/agents/run-playbook - executes autonomous cycle and returns directive', async () => {
      const res = await app.request('/api/agents/run-playbook', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.canvasDirective).toBeDefined();
      expect(body.data.canvasDirective.activeTab).toBeDefined();
    });

    it('POST /api/agents/reset-demo - re-arms dispute case-1 for repeat testing', async () => {
      const res = await app.request('/api/agents/reset-demo', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 9. PayPal Sandbox REST Adapter
  // --------------------------------------------------------------------------
  describe('Route Group: /api/paypal', () => {
    it('GET /api/paypal/status - checks PayPal Sandbox credentials and status', async () => {
      const res = await app.request('/api/paypal/status');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.environment).toBe('sandbox');
    });

    it('POST /api/paypal/create-order - creates an order or validates input', async () => {
      // Rejection path: non-positive cents
      const badRes = await app.request('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: 0 }),
      });
      expect(badRes.status).toBe(400);

      // Success path
      const res = await app.request('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: 25000,
          currency: 'USD',
          description: 'Milestone 1 Payment',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.orderId).toBeDefined();
    });

    it('POST /api/paypal/capture-order - captures an order or validates input', async () => {
      // Rejection path: missing orderId
      const badRes = await app.request('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(badRes.status).toBe(400);

      // Success path with simulated order ID prefix
      const res = await app.request('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: 'SIM-ORDER-123' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('COMPLETED');
    });
  });
});