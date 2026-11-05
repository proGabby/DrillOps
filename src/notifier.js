import { CONFIG } from './config.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { sendTelegramMessage } from './telegram.js';

/**
 * Dispatch message to configured notification provider (Telegram or WhatsApp)
 */
export async function sendNotification(messageText, options = { dryRun: false }) {
  const provider = (CONFIG.provider || 'telegram').toLowerCase();

  if (provider === 'telegram') {
    return await sendTelegramMessage(messageText, options);
  } else {
    // Falls back to WhatsApp (callmebot or twilio)
    return await sendWhatsAppMessage(messageText, options);
  }
}
