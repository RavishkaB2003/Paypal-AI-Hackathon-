import { Hono } from 'hono';
import {
  hasValidCredentials,
  createPayPalOrder,
  capturePayPalOrder,
  getAccessToken,
} from '../services/paypal';

export const paypalRoute = new Hono();

// GET /api/paypal/status - Check connection & credentials status
paypalRoute.get('/status', async (c) => {
  const configured = hasValidCredentials();

  let liveConnected = false;
  let connectionMessage = 'Running in simulated sandbox mode (add real credentials in .env to connect live)';

  if (configured) {
    try {
      await getAccessToken();
      liveConnected = true;
      connectionMessage = 'Connected to PayPal Sandbox REST API successfully';
    } catch (err: any) {
      connectionMessage = `Credential error: ${err.message}`;
    }
  }

  return c.json({
    success: true,
    configured,
    liveConnected,
    environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
    message: connectionMessage,
  });
});

// POST /api/paypal/create-order - Create PayPal checkout order
paypalRoute.post('/create-order', async (c) => {
  try {
    const body = await c.req.json();
    const amountCents = Number(body.amountCents);

    if (!amountCents || amountCents <= 0) {
      return c.json({ success: false, error: 'Positive amount in cents is required' }, 400);
    }

    const result = await createPayPalOrder({
      amountCents,
      currency: body.currency || 'USD',
      invoiceNumber: body.invoiceNumber,
      description: body.description,
    });

    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/paypal/capture-order - Capture authorized payment
paypalRoute.post('/capture-order', async (c) => {
  try {
    const body = await c.req.json();
    const orderId = body.orderId;

    if (!orderId) {
      return c.json({ success: false, error: 'orderId is required' }, 400);
    }

    const result = await capturePayPalOrder(orderId);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});