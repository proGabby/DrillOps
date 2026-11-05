import { CONFIG } from './config.js';

/**
 * Call Google Gemini REST API for lightweight dynamic enrichment and chat
 */
async function callGemini(systemPrompt, userPrompt, maxOutputTokens = 800) {
  if (!CONFIG.gemini.apiKey) {
    return null;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.gemini.model}:generateContent?key=${CONFIG.gemini.apiKey}`;

  try {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTask / User Message:\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`[AI Warning] Gemini API responded with ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate ? candidate.trim() : null;
  } catch (err) {
    console.warn(`[AI Warning] Failed to reach Gemini API: ${err.message}.`);
    return null;
  }
}

/**
 * Enrich morning challenge with a realistic situational flavor or mock log
 */
export async function enrichMorningChallenge(question) {
  if (!CONFIG.gemini.apiKey) return null;

  const system = `You are a Principal SRE & Distributed Systems Architect.
Your task is to provide a brief 2-sentence situational mock log or alert context for a daily engineering drill.
Keep it strictly under 50 words. Do NOT provide the answer or solution.`;

  const user = `Topic: ${question.domain} - ${question.title}
Scenario: ${question.scenario}
Generate a 2-sentence realistic mock log line or incident alert notification that an engineer would see on Slack or PagerDuty for this scenario.`;

  return await callGemini(system, user, 300);
}

/**
 * Enrich evening solution with a Senior Staff Engineer takeaway
 */
export async function enrichEveningSolution(question) {
  if (!CONFIG.gemini.apiKey) return null;

  const system = `You are a Senior Staff Engineer conducting an interview debrief.
Provide one concise "Staff Engineer War Story / Pro-Tip" (maximum 3 bullet points, under 70 words) for the question below.`;

  const user = `Question: ${question.question}
Answer Summary: ${question.answer}
Provide a high-yield pro-tip or real-world pitfall to watch out for in production.`;

  return await callGemini(system, user, 400);
}

/**
 * Interactive 2-Way AI Mentor Chat
 * Evaluates solutions, answers questions, and provides progressive hints.
 */
export async function askAIAssistant(userMessage, activeDrill = null) {
  if (!CONFIG.gemini.apiKey) {
    return `🤖 *AI Mentor Notice:*\n\nTo enable interactive AI chat with me, please add your free Google Gemini API key to your \`.env\` file:\n\`GEMINI_API_KEY=AIzaSy...\`\n\nGet a free key in 30 seconds at: https://aistudio.google.com/app/apikey`;
  }

  let contextInfo = '';
  if (activeDrill && activeDrill.question) {
    const q = activeDrill.question;
    contextInfo = `
Current Active Drill Context:
- Track: ${activeDrill.topic?.name || q.domain}
- Title: ${q.title}
- Difficulty: ${q.difficulty}
- Scenario: ${q.scenario}
- Challenge Question: ${q.question}
- Hints: ${JSON.stringify(q.hints || [])}
- Official Solution: ${q.answer}
- Common Pitfalls: ${q.pitfalls || 'N/A'}
- Key Takeaway: ${q.key_takeaway || 'N/A'}
`;
  }

  const system = `You are an elite Principal Distributed Systems Architect, Senior Staff SRE, and Technical Interviewer serving as the personal AI mentor for the "DrillOps" platform.

You communicate with senior engineering precision, clarity, and depth.
${contextInfo}

Your Guidelines:
1. If the user asks for a hint for today's drill, provide a progressive conceptual nudge or Socratic clue without prematurely spoiling the answer.
2. If the user submits their own solution, analysis, or code:
   - Validate what is correct.
   - Critique edge cases, concurrency hazards, memory/CPU bottlenecks, or production failure modes they missed.
   - Give them actionable constructive feedback like a senior interviewer.
3. If the user asks general engineering questions (Go, Node.js, Kubernetes, Linux, SRE, Kafka, Redis, Distributed Architecture), give insightful, practical explanations with real-world production context.
4. If the user asks for the solution or asks to solve today's challenge, provide a structured architectural walkthrough.
  5. Strict Formatting Rules:
  - Do NOT use markdown header hashes like '###' or '##'.Instead, use bold text(e.g. * Analysis:*, * Root Cause:*) for headings.
   - Do NOT use '***'.
   - Use clean bullet points('• ').
   - Use \`inline code\` for identifiers, filenames, and metrics, and \`\`\`code fences\`\`\` for multi-line code.
   - Keep paragraphs concise and clean on mobile.`;

  const reply = await callGemini(system, userMessage, 1000);
  return reply || "⚠️ Sorry, I had trouble reaching the AI service right now. Please try again in a few moments.";
}
