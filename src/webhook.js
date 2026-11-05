#!/usr/bin/env node

import { CONFIG } from './config.js';
import { setWebhook, getWebhookInfo, deleteWebhook, getBotInfo } from './telegram.js';

function printHelp() {
  console.log(`
DrillOps: Telegram Webhook Management
=====================================

Usage:
  node src/webhook.js <command> [arguments]

Commands:
  set <url>    Set Telegram webhook to your Vercel deployment URL
               Example: node src/webhook.js set https://drillops.vercel.app
  info         Check current webhook status and diagnosis
  delete       Delete active webhook (returns bot to local polling mode)
  help         Display this help message
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ? args[0].toLowerCase() : 'help';

  if (command === 'help' || !['set', 'info', 'delete'].includes(command)) {
    printHelp();
    return;
  }

  if (!CONFIG.telegram.botToken) {
    console.error('Error: TELEGRAM_BOT_TOKEN is missing in your .env or environment variables.');
    process.exit(1);
  }

  try {
    const bot = await getBotInfo();

    if (command === 'set') {
      let rawUrl = args[1];
      if (!rawUrl) {
        console.error('Error: Please provide your Vercel deployment URL.');
        console.log('Example: npm run webhook:set https://drillops.vercel.app');
        process.exit(1);
      }

      // Ensure https:// protocol
      if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = `https://${rawUrl}`;
      }

      // Automatically append /api/webhook if only base domain was passed
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        parsedUrl.pathname = '/api/webhook';
      }

      const webhookUrl = parsedUrl.toString();
      console.log(`Setting webhook for @${bot.username} to: ${webhookUrl}...`);
      const result = await setWebhook(webhookUrl);

      console.log('\nSuccess! Telegram webhook is configured.');
      console.log(`Webhook URL: ${webhookUrl}`);
      console.log(`Description: ${result.description || 'Webhook was set'}`);
      console.log('\nYou can now text your bot on Telegram 24/7 without needing your laptop on!\n');
    } else if (command === 'info') {
      console.log(`Checking webhook status for @${bot.username}...`);
      const info = await getWebhookInfo();

      console.log('\n' + '='.repeat(50));
      console.log('Telegram Webhook Diagnosis');
      console.log('='.repeat(50));
      console.log(`URL:                 ${info.url || '(none - polling mode)'}`);
      console.log(`Pending Updates:     ${info.pending_update_count || 0}`);
      if (info.last_error_date) {
        const errorDate = new Date(info.last_error_date * 1000).toISOString();
        console.log(`Last Error Date:     ${errorDate}`);
        console.log(`Last Error Message:  ${info.last_error_message}`);
      } else {
        console.log(`Last Error:          None (healthy)`);
      }
      console.log('='.repeat(50) + '\n');
    } else if (command === 'delete') {
      console.log(`Deleting active webhook for @${bot.username}...`);
      const result = await deleteWebhook();
      console.log('\nSuccess! Webhook deleted.');
      console.log(`Description: ${result.description || 'Webhook was deleted'}`);
      console.log('Bot is now ready for local polling via: npm run bot\n');
    } else {
      printHelp();
    }
  } catch (err) {
    console.error(`\nFailed to manage webhook: ${err.message}\n`);
    process.exit(1);
  }
}

main();
