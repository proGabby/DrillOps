import { CONFIG } from './config.js';

/**
 * Format markdown for WhatsApp compatibility:
 * WhatsApp uses:
 * - *bold* (instead of **bold**)
 * - _italic_ (instead of *italic*)
 * - ~strikethrough~
 * - ```monospace / code block```
 */
export function formatForWhatsApp(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert **bold** to *bold*
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '```\n$2```') // Standardize code fences
    .trim();
}

/**
 * Send WhatsApp message using CallMeBot Gateway
 */
async function sendViaCallMeBot(text) {
  const { phone, apiKey } = CONFIG.callmebot;
  if (!phone || !apiKey) {
    throw new Error('CallMeBot requires CALLMEBOT_PHONE and CALLMEBOT_API_KEY environment variables.');
  }

  // Clean phone number (remove +, spaces, hyphens)
  const cleanPhone = phone.replace(/[+\s-]/g, '');
  const encodedText = encodeURIComponent(text);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedText}&apikey=${apiKey}`;

  const response = await fetch(url, { method: 'GET' });
  const result = await response.text();

  if (!response.ok || result.toLowerCase().includes('error')) {
    throw new Error(`CallMeBot error: HTTP ${response.status} - ${result}`);
  }

  return { success: true, provider: 'callmebot', response: result };
}

/**
 * Send WhatsApp message using Twilio REST API
 */
async function sendViaTwilio(text) {
  const { accountSid, authToken, from, to } = CONFIG.twilio;
  if (!accountSid || !authToken || !to) {
    throw new Error('Twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_TO.');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    Body: text
  });

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Twilio error: ${json.message || response.statusText}`);
  }

  return { success: true, provider: 'twilio', sid: json.sid };
}

/**
 * Dispatch message to configured WhatsApp provider
 */
export async function sendWhatsAppMessage(messageText, options = { dryRun: false }) {
  const formattedText = formatForWhatsApp(messageText);

  if (options.dryRun) {
    console.log('\n[DRY RUN] WhatsApp Message Preview:\n' + '='.repeat(50));
    console.log(formattedText);
    console.log('='.repeat(50) + '\n');
    return { success: true, dryRun: true };
  }

  const provider = (CONFIG.provider || 'callmebot').toLowerCase();
  if (provider === 'twilio') {
    return await sendViaTwilio(formattedText);
  } else {
    return await sendViaCallMeBot(formattedText);
  }
}
