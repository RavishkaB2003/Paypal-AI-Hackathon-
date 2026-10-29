import 'dotenv/config';
import { getDb } from '../db/database';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: CachedToken | null = null;

const PAYPAL_ENV = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
const BASE_URL = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

// Detect whether valid credentials are configured
export function hasValidCredentials(): boolean {
  return (
    Boolean(CLIENT_ID) &&
    Boolean(CLIENT_SECRET) &&
    !CLIENT_ID.includes('your_') &&
    !CLIENT_SECRET.includes('your_')
  );
}

/**
 * Log all PayPal API calls with paypal-debug-id to SQLite audit_logs
 */
function logAudit(action: string, entityId: string, debugId: string | null, details: any): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (timestamp, action, entity_type, entity_id, paypal_debug_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      action,
      'PAYPAL_API',
      entityId,
      debugId,
      JSON.stringify(details)
    );
  } catch (err) {
    console.warn('[PayPal Audit Log] Failed to record audit log:', err);
  }
}

/**
 * Get an OAuth2 Access Token with caching (renews 60s before expiry)
 */
export async function getAccessToken(): Promise<string> {
  if (!hasValidCredentials()) {
    return 'simulated-sandbox-access-token';
  }

  // Check cache
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.accessToken;
  }

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const debugId = response.headers.get('paypal-debug-id');

  if (!response.ok) {
    const errorText = await response.text();
    logAudit('OAUTH_TOKEN_FAILED', 'oauth2', debugId, { error: errorText });
    throw new Error(`PayPal OAuth2 failure (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  logAudit('OAUTH_TOKEN_ACQUIRED', 'oauth2', debugId, { expiresIn: data.expires_in });
  return tokenCache.accessToken;
}

/**
 * Create a PayPal v2 Checkout Order (supports Milestone & Invoice payments)
 */
export async function createPayPalOrder(params: {
  amountCents: number;
  currency?: string;
  invoiceNumber?: string;
  description?: string;
}): Promise<{ orderId: string; status: string; debugId: string | null }> {
  const currency = params.currency || 'USD';
  const amountFormatted = (params.amountCents / 100).toFixed(2);

  if (!hasValidCredentials()) {
    const simulatedOrderId = `SIM-ORD-${Date.now()}`;
    const simulatedDebugId = `SIM-DEBUG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    logAudit('CREATE_ORDER_SIMULATED', simulatedOrderId, simulatedDebugId, { params });
    return {
      orderId: simulatedOrderId,
      status: 'CREATED',
      debugId: simulatedDebugId,
    };
  }

  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.invoiceNumber || `REF-${Date.now()}`,
          description: params.description || 'PayPulse Secure Payment',
          amount: {
            currency_code: currency,
            value: amountFormatted,
          },
        },
      ],
    }),
  });

  const debugId = response.headers.get('paypal-debug-id');
  const data = await response.json() as any;

  if (!response.ok) {
    logAudit('CREATE_ORDER_FAILED', 'orders', debugId, { error: data });
    throw new Error(`PayPal Create Order Failed: ${JSON.stringify(data)}`);
  }

  logAudit('CREATE_ORDER_SUCCESS', data.id, debugId, { amountFormatted, currency });
  return {
    orderId: data.id,
    status: data.status,
    debugId,
  };
}

/**
 * Capture a PayPal v2 Checkout Order
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  captureId: string;
  status: string;
  debugId: string | null;
}> {
  if (!hasValidCredentials() || orderId.startsWith('SIM-')) {
    const simCaptureId = `SIM-CAP-${Date.now()}`;
    const simDebugId = `SIM-DEBUG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    logAudit('CAPTURE_ORDER_SIMULATED', orderId, simDebugId, { captureId: simCaptureId });
    return {
      captureId: simCaptureId,
      status: 'COMPLETED',
      debugId: simDebugId,
    };
  }

  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const debugId = response.headers.get('paypal-debug-id');
  const data = await response.json() as any;

  if (!response.ok) {
    logAudit('CAPTURE_ORDER_FAILED', orderId, debugId, { error: data });
    throw new Error(`PayPal Capture Order Failed: ${JSON.stringify(data)}`);
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = capture?.id || data.id;

  logAudit('CAPTURE_ORDER_SUCCESS', orderId, debugId, { captureId, status: data.status });
  return {
    captureId,
    status: data.status,
    debugId,
  };
}