import { CONFIG } from './config.js';

/**
 * Format markdown for Telegram compatibility
 */
export function formatForTelegram(text) {
  if (!text) return '';
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

  return await sendTelegramReply(chatId, messageText);
}

/**
 * Send reply to a specific Telegram chat (with markdown and clean text fallback)
 */
export async function sendTelegramReply(targetChatId, messageText, replyToMessageId = null) {
  const { botToken } = CONFIG.telegram;
  if (!botToken) {
    throw new Error('Telegram requires TELEGRAM_BOT_TOKEN environment variable.');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const bodyPayload = {
    chat_id: targetChatId,
    text: messageText,
    parse_mode: 'Markdown'
  };

  if (replyToMessageId) {
    bodyPayload.reply_to_message_id = replyToMessageId;
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
  });

  let data = await response.json();

  // If Markdown formatting fails, fall back to plain text
  if (!data.ok) {
    bodyPayload.parse_mode = undefined;
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });
    data = await response.json();
  }

  if (!response.ok || !data.ok) {
    throw new Error(`Telegram error: ${data.description || response.statusText}`);
  }

  return { success: true, provider: 'telegram', messageId: data.result?.message_id };
}

/**
 * Send "typing..." chat action indicator while generating response
 */
export async function sendChatAction(targetChatId, action = 'typing') {
  const { botToken } = CONFIG.telegram;
  if (!botToken) return;

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendChatAction`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChatId, action })
    });
  } catch (err) {
    // Ignore transient chat action errors
  }
}

/**
 * Verify bot token and return bot identity
 */
export async function getBotInfo() {
  const { botToken } = CONFIG.telegram;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing.');
  }

  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Invalid Telegram Bot Token: ${data.description}`);
  }

  return data.result;
}

/**
 * Long-poll Telegram for incoming updates
 */
export async function getUpdates(offset = 0, timeout = 30) {
  const { botToken } = CONFIG.telegram;
  if (!botToken) return [];

  const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=${timeout}`;

  try {
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    return data.ok ? data.result : [];
  } catch (err) {
    console.warn(`[Telegram Poll Warning] ${err.message}`);
    return [];
  }
}
