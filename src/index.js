#!/usr/bin/env node

import { buildMorningChallenge, buildEveningSolution, TOPIC_SCHEDULE } from './engine.js';
import { sendNotification } from './notifier.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    phase: 'morning',
    dryRun: false,
    topic: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--phase' && args[i + 1]) {
      options.phase = args[++i].toLowerCase();
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--topic' && args[i + 1]) {
      options.topic = args[++i].toLowerCase();
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
DrillOps: Production Engineering & Systems Challenge Pipeline
============================================================

Usage:
  node src/index.js [options]

Options:
  --phase <morning|evening>   Which phase to execute (default: morning)
  --dry-run                   Print message to terminal without sending
  --topic <name>              Override today's scheduled topic
  --help, -h                  Display this help message

Available Topics:
  ${Object.values(TOPIC_SCHEDULE).map(t => `- ${t.key.padEnd(12)} (${t.name})`).join('\n  ')}

Examples:
  node src/index.js --phase morning --dry-run
  node src/index.js --phase evening --dry-run
  node src/index.js --phase morning --topic golang
`);
}

async function run() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`[Drill Pipeline] Starting run: Phase = ${options.phase.toUpperCase()}, DryRun = ${options.dryRun}`);

  try {
    if (options.phase === 'morning') {
      const { message, drillState } = await buildMorningChallenge(options.topic);
      console.log(`[Drill Pipeline] Morning challenge generated for: ${drillState.question.title} (${drillState.topic.name})`);

      const res = await sendNotification(message, { dryRun: options.dryRun });
      if (res.success) {
        console.log(`[Drill Pipeline] Morning challenge successfully dispatched via ${res.provider || 'notification'}.`);
      }
    } else if (options.phase === 'evening') {
      const { message, questionId } = await buildEveningSolution();
      console.log(`[Drill Pipeline] - Evening solution generated for drill ID: ${questionId}`);

      const res = await sendNotification(message, { dryRun: options.dryRun });
      if (res.success) {
        console.log(`[Drill Pipeline] - Evening deep dive successfully dispatched via ${res.provider || 'notification'}.`);
      }
    } else {
      console.error(`[Error] Unknown phase: '${options.phase}'. Must be 'morning' or 'evening'.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[Drill Pipeline Error]`, err.message);
    process.exit(1);
  }
}

run();
