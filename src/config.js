import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

// Basic .env file loader for Node without needing external dotenv package
export function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/(^["']|["']$)/g, '');
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

export const CONFIG = {
  provider: process.env.NOTIFICATION_PROVIDER || process.env.WHATSAPP_PROVIDER || 'telegram',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || ''
  },
  callmebot: {
    phone: process.env.CALLMEBOT_PHONE || '',
    apiKey: process.env.CALLMEBOT_API_KEY || ''
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
    to: process.env.TWILIO_WHATSAPP_TO || ''
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  },
  timezone: process.env.TIMEZONE || 'UTC',
  paths: {
    questionsDir: path.join(ROOT_DIR, 'data', 'questions'),
    stateDir: path.join(ROOT_DIR, 'data', 'state'),
    historyFile: path.join(ROOT_DIR, 'data', 'state', 'history.json'),
    activeDrillFile: path.join(ROOT_DIR, 'data', 'state', 'active_drill.json')
  }
};
