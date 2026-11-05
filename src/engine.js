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
 * Read JSON file safely
 */
function readJson(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err.message);
    return defaultValue;
  }
}

/**
 * Write JSON file safely
 */
function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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
export function selectQuestionForDrill(topic) {
  const allQuestions = loadQuestionsForTopic(topic.file);
  if (!allQuestions || allQuestions.length === 0) {
    throw new Error(`No questions found in bank for ${topic.name} (${topic.file})`);
  }

  const history = readJson(CONFIG.paths.historyFile, { completed_drill_ids: [], history: [] });
  const completedIds = new Set(history.completed_drill_ids || []);

  let available = allQuestions.filter(q => !completedIds.has(q.id));

  // If all questions have been delivered, reset completed IDs for this domain
  if (available.length === 0) {
    console.log(`[Info] All questions in ${topic.name} have been drilled! Cycling question bank.`);
    available = allQuestions;
    // Clear only this domain's IDs
    const domainIds = new Set(allQuestions.map(q => q.id));
    history.completed_drill_ids = history.completed_drill_ids.filter(id => !domainIds.has(id));
    writeJson(CONFIG.paths.historyFile, history);
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
export async function buildEveningSolution() {
  const activeDrill = readJson(CONFIG.paths.activeDrillFile);

  if (!activeDrill || !activeDrill.question) {
    throw new Error('No active morning drill found to solve. Run morning phase first or specify a test.');
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
