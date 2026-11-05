import { CONFIG } from './config.js';

/**
 * Format markdown for Telegram compatibility
 */
export function formatForTelegram(text) {
  if (!text) return '';
  // Standardize bold and code fences
  return text.trim();
}

/**
 * Send notification to Telegram channel or direct message
 */
export async function sendTelegramMessage(messageText, options = { dryRun: false }) {
  const { botToken, chatId } = CONFIG.telegram;

  if (options.dryRun) {
    console.log('\n[DRY RUN] Telegram Message Preview:\n' + '='.repeat(50));
    console.log(messageText);
    console.log('='.repeat(50) + '\n');
    return { success: true, dryRun: true };
  }

  if (!botToken || !chatId) {
    throw new Error('Telegram requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  // First try sending with Markdown formatting
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: messageText,
      parse_mode: 'Markdown'
    })
  });

  let data = await response.json();

  // If Telegram rejects markdown formatting, fall back to plain text so delivery never fails
  if (!data.ok) {
    console.warn(`[Telegram Notice] Markdown formatting rejected (${data.description}), sending as clean text...`);
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText
      })
    });
    data = await response.json();
  }

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram error: ${data.description || response.statusText}`);
  }

  return { success: true, provider: 'telegram', messageId: data.result?.message_id };
}

