#!/usr/bin/env node

import fs from 'node:fs';
import { CONFIG } from './config.js';
import { getBotInfo, getUpdates, sendTelegramReply, sendChatAction } from './telegram.js';
import { askAIAssistant } from './ai.js';
import { buildMorningChallenge, buildEveningSolution } from './engine.js';

function readActiveDrill() {
  try {
    if (fs.existsSync(CONFIG.paths.activeDrillFile)) {
      const content = fs.readFileSync(CONFIG.paths.activeDrillFile, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Ignore read errors
  }
  return null;
}

function getWelcomeMessage(firstName = 'Engineer') {
  return `👋 *Hello, ${firstName}!*

I am your personal *Daily Tech Drill & AI Engineering Mentor* powered by Google Gemini.

🎯 *Daily Drill Commands:*
• /drill — View today's active morning challenge
• /hint — Get a smart progressive hint without spoilers
• /solution — Reveal the complete architectural post-mortem & answer

💬 *Interactive AI Coaching:*
• *Submit your answer or code:* Just type your solution and ask me to review it!
• *Ask any question:* Ask about Go internals, Node.js event loop, Kubernetes triage, SRE, Linux kernel, or ByteByteGo distributed architectures.

_What technical problem are we tackling today?_`;
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const userFirst = msg.from?.first_name || 'Engineer';
  const replyToId = msg.message_id;

  if (!text) return;

  console.log(`[Bot Message] From ${userFirst} (${chatId}): "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`);

  // Show typing indicator in Telegram
  await sendChatAction(chatId, 'typing');

  // Command handling
  const lower = text.toLowerCase();

  if (lower === '/start' || lower === '/help') {
    return await sendTelegramReply(chatId, getWelcomeMessage(userFirst), replyToId);
  }

  const activeDrill = readActiveDrill();

  if (lower === '/drill' || lower === '/today') {
    if (activeDrill && activeDrill.question) {
      const q = activeDrill.question;
      const t = activeDrill.topic;
      let reply = `🧠 *TODAY'S ACTIVE DRILL*\n\n`;
      reply += `📅 *Track:* ${t.name}\n`;
      reply += `🎯 *Focus:* ${q.title}\n`;
      reply += `📊 *Difficulty:* ${q.difficulty}\n\n`;
      reply += `*The Scenario:*\n${q.scenario}\n\n`;
      reply += `*Your Challenge:*\n${q.question}\n\n`;
      if (q.hints && q.hints.length) {
        reply += `💡 *Hints:*\n` + q.hints.map((h, i) => `  ${i + 1}. ${h}`).join('\n') + '\n\n';
      }
      reply += `_Reply with your proposed solution or code to get it reviewed!_`;
      return await sendTelegramReply(chatId, reply, replyToId);
    } else {
      // Build a morning challenge if none is active
      const { message } = await buildMorningChallenge();
      return await sendTelegramReply(chatId, message, replyToId);
    }
  }

  if (lower === '/solution' || lower === '/answer') {
    try {
      const { message } = await buildEveningSolution();
      return await sendTelegramReply(chatId, message, replyToId);
    } catch (err) {
      if (activeDrill && activeDrill.question) {
        const q = activeDrill.question;
        let reply = `✅ *DRILL SOLUTION: ${q.title}*\n\n`;
        reply += `${q.answer}\n\n`;
        if (q.pitfalls) reply += `⚠️ *Pitfalls:*\n${q.pitfalls}\n\n`;
        if (q.key_takeaway) reply += `🔑 *Takeaway:*\n_${q.key_takeaway}_`;
        return await sendTelegramReply(chatId, reply, replyToId);
      }
      return await sendTelegramReply(chatId, "No active drill found right now. Send /drill to start one!", replyToId);
    }
  }

  if (lower === '/hint') {
    if (!activeDrill) {
      return await sendTelegramReply(chatId, "No active drill right now! Send /drill to generate today's challenge.", replyToId);
    }
    const aiHint = await askAIAssistant(
      "Give me a subtle, thought-provoking Socratic hint for today's drill. Do NOT reveal the direct answer.",
      activeDrill
    );
    return await sendTelegramReply(chatId, `💡 *AI Mentor Hint:*\n\n${aiHint}`, replyToId);
  }

  // Conversational AI Mentor response (handles code reviews, technical questions, free chat)
  const aiResponse = await askAIAssistant(text, activeDrill);
  return await sendTelegramReply(chatId, aiResponse, replyToId);
}

async function startBot() {
  if (!CONFIG.telegram.botToken) {
    console.error('[Error] TELEGRAM_BOT_TOKEN is missing in .env! Please set it before starting the bot.');
    process.exit(1);
  }

  try {
    const bot = await getBotInfo();
    console.log('\n' + '='.repeat(60));
    console.log(`🤖 [Telegram AI Bot] Successfully connected as @${bot.username}`);
    console.log(`📡 [Telegram AI Bot] Listening for incoming messages & code reviews...`);
    console.log(`💡 [Telegram AI Bot] Press Ctrl+C anytime to stop.`);
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    console.error(`[Error] Failed to connect to Telegram: ${err.message}`);
    process.exit(1);
  }

  let offset = 0;

  // Graceful shutdown
  let isRunning = true;
  process.on('SIGINT', () => {
    console.log('\n[Telegram AI Bot] Stopping listener...');
    isRunning = false;
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    isRunning = false;
    process.exit(0);
  });

  // Long-polling loop
  while (isRunning) {
    try {
      const updates = await getUpdates(offset, 30);
      for (const update of updates) {
        offset = update.update_id + 1;
        if (update.message) {
          await handleMessage(update.message);
        }
      }
    } catch (err) {
      console.warn(`[Bot Loop Error] ${err.message}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

startBot();

