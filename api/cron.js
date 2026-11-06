import { buildMorningChallenge, buildEveningSolution } from '../src/engine.js';
import { sendNotification } from '../src/notifier.js';

export const config = {
  maxDuration: 30
};

/**
 * Vercel Native Cron Handler
 * Triggered automatically by Vercel on schedule:
 * - Morning Challenge: 06:15 UTC (07:15 AM WAT)
 * - Evening Deep Dive: 19:30 UTC (08:30 PM WAT)
 */
export default async function handler(req, res) {
  // Security: If CRON_SECRET is configured in Vercel environment variables, verify it
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const phase = (req.query.phase || 'morning').toLowerCase();
  console.log(`[Vercel Cron] Running scheduled task for phase: ${phase.toUpperCase()}`);

  try {
    let messageText;
    let drillInfo;

    if (phase === 'morning') {
      const { message, drillState } = await buildMorningChallenge();
      messageText = message;
      drillInfo = {
        title: drillState.question.title,
        domain: drillState.topic.name,
        difficulty: drillState.question.difficulty
      };
    } else if (phase === 'evening') {
      const { message, questionId } = await buildEveningSolution();
      messageText = message;
      drillInfo = { drillId: questionId };
    } else {
      return res.status(400).json({
        error: `Invalid phase '${phase}'. Must be 'morning' or 'evening'.`
      });
    }

    const dispatch = await sendNotification(messageText, { dryRun: false });

    return res.status(200).json({
      success: true,
      phase,
      drillInfo,
      dispatch,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`[Vercel Cron Error]`, err);
    return res.status(500).json({
      success: false,
      error: err.message,
      phase,
      timestamp: new Date().toISOString()
    });
  }
}

