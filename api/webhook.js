import { handleMessage } from '../src/bot.js';

export const config = {
  maxDuration: 15
};

/**
 * Vercel Serverless Function: Telegram Webhook Handler
 */
export default async function handler(req, res) {
  // Allow health/status check in browser via GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'DrillOps Telegram AI Webhook',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (update && update.message) {
      await handleMessage(update.message);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[DrillOps Webhook Error]', err);
    // Always return 200 so Telegram considers the update delivered
    return res.status(200).json({ ok: false, error: err.message });
  }
}

