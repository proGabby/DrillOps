import { CONFIG } from './config.js';

/**
 * Call Google Gemini REST API for lightweight dynamic enrichment
 */
async function callGemini(systemPrompt, userPrompt) {
  if (!CONFIG.gemini.apiKey) {
    return null;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.gemini.model}:generateContent?key=${CONFIG.gemini.apiKey}`;

  try {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
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
    console.warn(`[AI Warning] Failed to reach Gemini API: ${err.message}. Proceeding with curated bank.`);
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

  return await callGemini(system, user);
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

  return await callGemini(system, user);
}
