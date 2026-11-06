import { test, expect } from '@playwright/test';

test.describe('PayPulse Finity Studio — End-to-End Browser Test Suite', () => {
  test.beforeEach(async ({ request }) => {
    // Reset SQLite demo state before every test to guarantee clean deterministic baseline
    try {
      await request.post('http://localhost:3001/api/settings/reset-demo');
    } catch {
      // Server may boot on demand via webServer
    }
  });

  test('Workflow 1: Overview Bento & Live Wallet Deposit', async ({ page }) => {
    await page.goto('/');

    // Verify Brand Logo & Overview Title
    await expect(page.locator('text=PayPulse')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Deposit Flow
    await page.click('button:has-text("Deposit")');
    await expect(page.locator('h3:has-text("Deposit Funds")')).toBeVisible();

    await page.fill('input[type="number"]', '500');
    await page.click('button:has-text("Confirm Deposit")');

    // Verify Deposit toast and updated balance
    await expect(page.locator('text=Deposited $500')).toBeVisible();

    // Test Payment Card Switcher
    const nextCardBtn = page.locator('button[aria-label="Next card"]');
    if (await nextCardBtn.isVisible()) {
      await nextCardBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('Workflow 2: Invoices AG Grid & 30/40/30 Split Creation', async ({ page }) => {
    await page.goto('/');

    // Navigate to Invoices Tab
    await page.click('nav button:has-text("Invoices")');
    await expect(page.locator('h1')).toContainText('Invoices');

    // Open Create Invoice Modal
    await page.click('button:has-text("Create invoice")');
    await expect(page.locator('text=Create Invoice or Payment Plan')).toBeVisible();

    // Fill form
    await page.fill('input[placeholder="e.g. Stripe Global Inc"]', 'Playwright Automated Corp');
    await page.fill('input[placeholder="finance@company.com"]', 'billing@playwright.com');
    await page.fill('input[type="number"]', '3000');

    // Submit invoice
    await page.click('button:has-text("Create & Send Invoice")');

    // Assert notification
    await expect(page.locator('text=split into 3 steps')).toBeVisible();
  });

  test('Workflow 3: Smart Scan with Gemini 3.8 Flash Multimodal Vision', async ({ page }) => {
    await page.goto('/');

    // Navigate to Smart Scan
    await page.click('nav button:has-text("Smart Scan")');
    await expect(page.locator('h1')).toContainText('Receipt & Document Scanner');

    // Verify clean initial Bento state (Zero Mock Fallback)
    await expect(page.locator('text=No Document Scanned Yet')).toBeVisible();

    // Trigger Sample Waybill scan
    await page.click('button:has-text("Sample Waybill")');

    // Wait for AI Vision extraction and SHA-256 seal
    await expect(page.locator('text=Extracted Details')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=SHA-256 Proof:')).toBeVisible();

    // Convert Scan to Invoice
    await page.click('button:has-text("Create Invoice from Scan")');
    await expect(
      page.locator('text=Invoice created and linked').or(page.locator('text=DHL Express Global Logistics'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('Workflow 4: Milestones 30/40/30 Escrow Tranche Release & New Agreement', async ({ page }) => {
    await page.goto('/');

    // Navigate to Milestones Tab
    await page.click('nav button:has-text("Milestones")');
    await expect(page.locator('h1')).toContainText('Project Milestones');

    // Locate actionable "Release Stage Funds (Approve)" button
    const releaseBtn = page.locator('[data-testid="release-stage-funds-btn"]').first();
    await expect(releaseBtn).toBeVisible();

    // Click Release Stage Funds
    await releaseBtn.click();

    // Verify fund release badge
    await expect(page.locator('[data-testid="stage-funds-released-badge"]').first()).toBeVisible({ timeout: 10000 });

    // Open New Agreement Modal
    await page.click('[data-testid="new-agreement-button"]');
    await expect(page.locator('text=Create Milestone Agreement')).toBeVisible();

    // Fill Agreement Form
    await page.fill('[data-testid="agreement-title-input"]', 'E2E Playwright Staged Escrow');
    await page.fill('[data-testid="agreement-client-input"]', 'Global Cloud Enterprises');
    await page.fill('[data-testid="agreement-total-input"]', '7500');

    // Submit Agreement
    await page.click('[data-testid="confirm-create-agreement-btn"]');
    await expect(page.locator('text=Milestone agreement created')).toBeVisible();
  });

  test('Workflow 5: Protection Tab, Evidence Submission & Autonomous Agent Auto-Defense', async ({ page }) => {
    await page.goto('/');

    // Navigate to Protection Tab
    await page.click('nav button:has-text("Protection")');
    await expect(page.locator('h1')).toContainText('Disputes & Protection');

    // Click "Submit Delivery Proof" on open claim
    const submitProofBtn = page.locator('[data-testid="submit-proof-btn"]').first();
    if (await submitProofBtn.isVisible()) {
      await submitProofBtn.click();
      await expect(page.locator('h3:has-text("Submit Delivery Proof")')).toBeVisible();

      // Submit Proof Modal
      await page.click('[data-testid="confirm-submit-proof-btn"]');
      await expect(page.locator('text=Proof submitted and registered')).toBeVisible();
    }

    // Run Autonomous Dispute Protection Agent
    const runAgentBtn = page.locator('[data-testid="run-defense-agent-btn"]');
    await expect(runAgentBtn).toBeVisible();
    await runAgentBtn.click();

    // Verify Autonomous Defense completion banner
    await expect(page.locator('text=Autonomous Agent finished:')).toBeVisible({ timeout: 15000 });
  });

  test('Workflow 6: Workspace Assistant Command Palette (Ctrl+K) & Live Search', async ({ page }) => {
    await page.goto('/');

    // Open Command Palette via Add widget button
    await page.click('button:has-text("Add widget")');
    await expect(page.locator('text=Workspace Search & Widgets')).toBeVisible();

    // Live SQLite Multi-Entity Search
    const searchInput = page.locator('[data-testid="workspace-search-input"]');
    await searchInput.fill('INV');
    await expect(page.locator('text=Workspace Records')).toBeVisible();

    // Test Autonomous Protection Agent from within Command Palette
    await page.click('button:has-text("Run Now")');
    await expect(page.locator('text=Defended').first()).toBeVisible({ timeout: 15000 });

    // Close Modal
    await page.keyboard.press('Escape');
  });
});
