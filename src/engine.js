import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { enrichMorningChallenge, enrichEveningSolution } from './ai.js';

// Weekly Domain Schedule Mapping (0 = Sunday, 1 = Monday, ...)
export const TOPIC_SCHEDULE = {
  1: { key: 'devops', name: 'DevOps & Containers', file: 'devops.json' },
  2: { key: 'golang', name: 'Backend with Go', file: 'golang.json' },
  3: { key: 'nodejs', name: 'Node.js Backend & Libuv', file: 'nodejs.json' },
  4: { key: 'sre', name: 'Site Reliability Engineering (SRE)', file: 'sre.json' },
  5: { key: 'tools', name: 'Tools & Observability', file: 'tools.json' },
  6: { key: 'architecture', name: 'Distributed Architecture', file: 'architecture.json' },
  0: { key: 'incident', name: 'Production War Stories & Triage', file: 'incident.json' }
};

/**
 * Read JSON file safely with serverless fallback
 */
function readJson(filePath, defaultValue = null) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Proceed to fallback
  }

  // Fallback to /tmp in serverless environments (e.g. Vercel)
  try {
    const tmpPath = path.join('/tmp', path.basename(filePath));
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (_) { }

  return defaultValue;
}

/**
 * Write JSON file safely with serverless fallback
 */
function writeJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // In read-only serverless environments like Vercel, write to /tmp
    try {
      const tmpPath = path.join('/tmp', path.basename(filePath));
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (_) { }
  }
}

/**
 * Get topic config for a given day (defaults to current day of week)
 */
export function getTopicForToday(overrideTopicKey = null) {
  if (overrideTopicKey) {
    const found = Object.values(TOPIC_SCHEDULE).find(t => t.key === overrideTopicKey.toLowerCase());
    if (found) return found;
  }
  const dayOfWeek = new Date().getDay();
  return TOPIC_SCHEDULE[dayOfWeek];
}

/**
 * Load questions for a specific topic file
 */
export function loadQuestionsForTopic(topicFile) {
  const filePath = path.join(CONFIG.paths.questionsDir, topicFile);
  return readJson(filePath, []);
}

/**
 * Pick next uncompleted question for a topic, resetting history if exhausted
 */
export function selectQuestionForDrill(topic, targetDate = new Date()) {
  const allQuestions = loadQuestionsForTopic(topic.file);
  if (!allQuestions || allQuestions.length === 0) {
    throw new Error(`No questions found in bank for ${topic.name} (${topic.file})`);
  }

  const history = readJson(CONFIG.paths.historyFile, { completed_drill_ids: [], history: [] });
  const completedIds = new Set(history.completed_drill_ids || []);

  let available = allQuestions.filter(q => !completedIds.has(q.id));

  // If in stateless serverless environments (e.g. Vercel) where history is not persisted across containers,
  // cycle deterministically across weeks based on date so morning & evening always match
  if (available.length === 0 || completedIds.size === 0) {
    const epoch = new Date('2026-01-01T00:00:00Z').getTime();
    const now = targetDate.getTime();
    const diffWeeks = Math.max(0, Math.floor((now - epoch) / (7 * 24 * 60 * 60 * 1000)));
    const index = diffWeeks % allQuestions.length;
    return allQuestions[index];
  }

  // Select the next question
  const selected = available[0];
  return selected;
}

/**
 * Build the Morning Challenge message
 */
export async function buildMorningChallenge(overrideTopic = null) {
  const topic = getTopicForToday(overrideTopic);
  const question = selectQuestionForDrill(topic);

  // Optional AI dynamic context
  const aiMockLog = await enrichMorningChallenge(question);

  let msg = `🧠 *DRILLOPS: MORNING CHALLENGE*\n`;
  msg += `📅 *Track:* ${topic.name}\n`;
  msg += `🎯 *Focus:* ${question.title}\n`;
  msg += `📊 *Difficulty:* ${question.difficulty}\n\n`;

  msg += `*The Scenario:*\n${question.scenario}\n\n`;

  if (aiMockLog) {
    msg += `🚨 *Simulated Incident Alert:*\n\`\`\`\n${aiMockLog}\n\`\`\`\n\n`;
  }

  msg += `*Your Challenge:*\n${question.question}\n\n`;

  if (question.hints && question.hints.length > 0) {
    msg += `💡 *Hints to Consider:*\n`;
    question.hints.forEach((hint, idx) => {
      msg += `  ${idx + 1}. ${hint}\n`;
    });
    msg += `\n`;
  }

  msg += `⏳ _Take a few moments to think through the architectural trade-offs or code fix today. The complete post-mortem and deep dive will be delivered this evening!_`;

  // Save active drill state for evening delivery
  const state = {
    date: new Date().toISOString().split('T')[0],
    topic,
    question,
    aiMockLog,
    sentAt: new Date().toISOString()
  };
  writeJson(CONFIG.paths.activeDrillFile, state);

  return { message: msg, drillState: state };
}

/**
 * Build the Evening Solution & Deep Dive message
 */
export async function buildEveningSolution(overrideTopic = null) {
  let activeDrill = readJson(CONFIG.paths.activeDrillFile);
  const todayStr = new Date().toISOString().split('T')[0];

  // In stateless serverless environments (Vercel), morning state file is not preserved across containers.
  // If active_drill.json is null or missing for today, resolve today's scheduled drill automatically!
  if (!activeDrill || !activeDrill.question || activeDrill.date !== todayStr) {
    const topic = getTopicForToday(overrideTopic);
    const question = selectQuestionForDrill(topic);
    activeDrill = {
      date: todayStr,
      topic,
      question
    };
  }

  const { question, topic } = activeDrill;

  // Optional AI senior pro-tip
  const aiTip = await enrichEveningSolution(question);

  let msg = `✅ *DRILLOPS: EVENING DEEP DIVE*\n`;
  msg += `🎯 *Topic:* ${question.title} (${topic.name})\n\n`;

  msg += `*The Solution & Post-Mortem:*\n${question.answer}\n\n`;

  if (question.pitfalls) {
    msg += `⚠️ *Common Pitfalls & Misconceptions:*\n${question.pitfalls}\n\n`;
  }

  if (aiTip) {
    msg += `🎖️ *Staff Engineer Perspective:*\n${aiTip}\n\n`;
  }

  if (question.key_takeaway) {
    msg += `🔑 *Core Rule of Thumb:*\n_${question.key_takeaway}_\n\n`;
  }

  msg += `👏 _Great work practicing today. Tomorrow we tackle our next engineering domain!_`;

  // Update history state so this question isn't repeated right away
  const history = readJson(CONFIG.paths.historyFile, { completed_drill_ids: [], history: [] });
  if (!history.completed_drill_ids.includes(question.id)) {
    history.completed_drill_ids.push(question.id);
  }
  history.history.push({
    drill_id: question.id,
    domain: question.domain,
    completed_at: new Date().toISOString()
  });
  writeJson(CONFIG.paths.historyFile, history);

  // Clear active drill file
  writeJson(CONFIG.paths.activeDrillFile, null);

  return { message: msg, questionId: question.id };
}
