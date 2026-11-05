import { CONFIG } from './config.js';

/**
 * Convert standard Markdown into Telegram-compatible HTML formatting
 * Eliminates raw '###', '***', '**', and unescaped markdown symbols.
 */
  export function formatForTelegram(markdown) {
    if (!markdown) return '';

    const codeBlocks = [];
    const inlineCodes = [];

    // 1. Protect multi-line code blocks
    let text = markdown.replace(/```(?:([a-zA-Z0-9_-]+)\n)?([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const langAttr = lang ? ` class="language-${lang}"` : '';
      codeBlocks.push(`<pre><code${langAttr}>${escapedCode.trimEnd()}</code></pre>`);
      return placeholder;
    });

    // 2. Protect inline code `code`
    text = text.replace(/`([^`\n]+)`/g, (match, code) => {
      const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      inlineCodes.push(`<code>${escapedCode}</code>`);
      return placeholder;
    });

    // 3. Escape raw HTML entities in prose
    text = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 4. Convert Markdown headers: ### Heading, ## Heading, # Heading -> <b>Heading</b>
    text = text.replace(/^#{1,6}\s*(.+)$/gm, '<b>$1</b>');

    // 5. Convert bold italic: ***text*** -> <b><i>text</i></b>
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');

    // 6. Convert bold: **text** -> <b>text</b>
    text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

    // 7. Convert single-asterisk bold: *text* (used in WhatsApp & drill templates) -> <b>text</b>
    text = text.replace(/(?<!\w)\*([^\*\n]+)\*(?!\w)/g, '<b>$1</b>');

    // 8. Convert italic: _text_ -> <i>text</i>
    text = text.replace(/(?<!\w)_([^\_\n]+)_(?!\w)/g, '<i>$1</i>');

    // 9. Convert bullet lists (- item or * item) -> • item
    text = text.replace(/^(\s*)[-\*]\s+/gm, '$1• ');

    // 10. Clean up horizontal rules (--- or ===)
    text = text.replace(/^[-\=_]{3,}\s*$/gm, '');

    // 11. Restore protected inline code
    text = text.replace(/___INLINE_CODE_(\d+)___/g, (_, id) => inlineCodes[Number(id)]);

    // 12. Restore protected code blocks
    text = text.replace(/___CODE_BLOCK_(\d+)___/g, (_, id) => codeBlocks[Number(id)]);

    return text.trim();
  }

  /**
   * Clean plain text fallback (strips all markdown symbols completely)
   */
  export function stripMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^#{1,6}\s*(.+)$/gm, '$1')
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/(?<!\w)\*([^\*\n]+)\*(?!\w)/g, '$1')
      .replace(/(?<!\w)_([^\_\n]+)_(?!\w)/g, '$1')
      .replace(/^(\s*)[-\*]\s+/gm, '$1• ')
      .replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/^[-\=_]{3,}\s*$/gm, '')
      .trim();
  }

  /**
   * Send notification to Telegram channel or direct message
   */
  export async function sendTelegramMessage(messageText, options = { dryRun: false }) {
    const { botToken, chatId } = CONFIG.telegram;

    if (options.dryRun) {
      const formattedHtml = formatForTelegram(messageText);
      console.log('\n[DRY RUN] Telegram Message Preview:\n' + '='.repeat(50));
      console.log(formattedHtml);
      console.log('='.repeat(50) + '\n');
      return { success: true, dryRun: true };
    }

    if (!botToken || !chatId) {
      throw new Error('Telegram requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables.');
    }

    return await sendTelegramReply(chatId, messageText);
  }

  /**
   * Send reply to a specific Telegram chat formatted as rich HTML
   * Eliminates all raw '###', '***', and '**' markdown artifacts.
   */
  export async function sendTelegramReply(targetChatId, messageText, replyToMessageId = null) {
    const { botToken } = CONFIG.telegram;
    if (!botToken) {
      throw new Error('Telegram requires TELEGRAM_BOT_TOKEN environment variable.');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const formattedHtml = formatForTelegram(messageText);

    const bodyPayload = {
      chat_id: targetChatId,
    text: formattedHtml,
      parse_mode: 'HTML'
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

    // If HTML parsing fails for any reason, fall back to clean plain text (with symbols stripped)
    if (!data.ok) {
      console.warn(`[Telegram Notice] HTML parse fallback triggered (${data.description}), sending stripped text...`);
      bodyPayload.parse_mode = undefined;
      bodyPayload.text = stripMarkdown(messageText);
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
      if (!data.ok) {
        throw new Error(data.description || 'Failed to fetch updates');
      }
      return data.result || [];
    } catch (err) {
      throw err;
    }
  }

  /**
   * Register a webhook URL with Telegram
   */
  export async function setWebhook(webhookUrl) {
    const { botToken } = CONFIG.telegram;
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing.');

    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message']
      })
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Failed to set Telegram webhook: ${data.description}`);
    }
    return data;
  }

  /**
   * Retrieve current webhook status and diagnosis from Telegram
   */
  export async function getWebhookInfo() {
    const { botToken } = CONFIG.telegram;
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing.');

    const url = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Failed to get webhook info: ${data.description}`);
    }
    return data.result;
  }

  /**
   * Delete active webhook (switches bot back to polling mode)
   */
  export async function deleteWebhook() {
    const { botToken } = CONFIG.telegram;
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is missing.');

    const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Failed to delete webhook: ${data.description}`);
    }
    return data;
  }
