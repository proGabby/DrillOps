# 🧠 Daily Tech Drill (DevOps, Go, Node.js, SRE, Tools)

An automated 2-phase daily technical challenge pipeline designed to sharpen production engineering instincts and prepare for senior backend / DevOps / SRE interviews. Delivered straight to your WhatsApp every morning and evening via GitHub Actions.

---

## 🎯 Weekly Topic Rotation

| Day of Week | Track | Focus & Core Concepts |
| :--- | :--- | :--- |
| **Monday** | **DevOps & Containers** | Docker multi-stage builds, rootless containers, K8s CrashLoopBackOff & OOMKilled triage, Helm, GitOps with ArgoCD. |
| **Tuesday** | **Backend with Go** | Goroutine leaks, unbuffered channels, memory escape analysis, GC pressure, `sync.Pool`, race conditions, `pprof`. |
| **Wednesday** | **Node.js Backend & Libuv** | Event loop phases, microtask starvation (`process.nextTick`), libuv thread pool exhaustion, streams backpressure, memory leaks. |
| **Thursday** | **SRE & SLOs** | Multi-window multi-burn-rate alerts, cascading failures, cache stampede (Thundering Herd), circuit breakers, load shedding. |
| **Friday** | **Tools & Observability** | Prometheus (rate vs irate, histogram quantiles), OpenTelemetry W3C trace propagation, Terraform state locking, Linux diagnostics (`strace`, `ss`). |
| **Saturday** | **Distributed Architecture** | Idempotency key design, database connection pool starvation, Saga patterns, caching strategies. |
| **Sunday** | **Production War Stories** | Real-world incident triage, post-deployment 504 timeouts, Redis single-thread blocking (`KEYS *`). |

---

## ⏰ How the 2-Phase Delivery Works

1. **Phase 1 (Morning — 08:00 UTC): The Challenge**
   - Sends a realistic production scenario, technical challenge, and 2 hints to your WhatsApp.
   - **No solution is revealed yet.** You spend the day thinking about the architecture, edge cases, and code fix.
2. **Phase 2 (Evening — 18:00 UTC): The Deep Dive & Post-Mortem**
   - Delivers the comprehensive architectural answer, common pitfalls, and a core rule-of-thumb takeaway.
   - If `GEMINI_API_KEY` is provided, includes a Staff Engineer pro-tip.
   - Automatically records the drill in `data/state/history.json` so you never receive duplicate questions until the bank cycles.

---

## 🚀 Quick Setup Guide

### Step 1: Get Your Free WhatsApp API Key (CallMeBot)

CallMeBot is a free, reliable gateway to send personal WhatsApp messages without 72-hour sandbox timeouts:

1. Add the phone number **`+34 644 44 24 99`** or **`+34 644 87 23 93`** to your phone contacts as *CallMeBot*.
2. Open WhatsApp and send the following message to that contact:
   ```text
   I allow callmebot to send me messages
   ```
3. CallMeBot will reply within a few seconds with:
   ```text
   API Key Created! Your API Key is: 123456
   ```
4. Note down:
   - Your phone number in international format without `+` or spaces (e.g. `2348012345678` for Nigeria, `14155552671` for US).
   - Your API key (e.g. `123456`).

---

### Step 2: Push This Project to a New GitHub Repository

From your terminal:

```bash
cd /Users/macbookpro/Documents/inimfon/daily-tech-drill

# Initialize git repository
git init
git add .
git commit -m "feat: initial daily tech drill pipeline"

# Create a new private or public repository on GitHub (e.g., daily-tech-drill)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/daily-tech-drill.git
git branch -M main
git push -u origin main
```

---

### Step 3: Configure GitHub Secrets

1. In your GitHub repository, navigate to **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add the following:

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `WHATSAPP_PROVIDER` | WhatsApp service to use | `callmebot` |
| `CALLMEBOT_PHONE` | Your international phone number | `2348012345678` |
| `CALLMEBOT_API_KEY` | The API key CallMeBot sent you | `123456` |
| `GEMINI_API_KEY` *(Optional)* | Google AI Studio free API key for AI enrichment | `AIzaSy...` |

*(Optional Gemini API key: Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey) to enable simulated incident alerts and Staff Engineer takeaways).*

---

### Step 4: Test It Immediately on GitHub Actions

1. Go to the **Actions** tab in your repository.
2. Under **All workflows**, select **Daily Tech Drill Pipeline**.
3. Click **Run workflow**:
   - Choose `phase: morning`.
   - Leave `dry_run: false`.
4. Check your WhatsApp — you should receive your morning challenge in seconds!

---

## 🛠️ Local Development & Testing

You can run and test the pipeline on your machine:

```bash
cd /Users/macbookpro/Documents/inimfon/daily-tech-drill

# Test morning challenge in terminal (Dry Run - no WhatsApp message sent)
npm run drill:test

# Test evening deep dive
npm run drill:evening -- --dry-run

# Test a specific domain (e.g. Go or Node)
node src/index.js --phase morning --topic golang --dry-run
node src/index.js --phase morning --topic nodejs --dry-run
```

---

## 📂 Project Structure

```
daily-tech-drill/
├── .github/
│   └── workflows/
│       └── daily-drill.yml       # GitHub Actions cron schedules (08:00 & 18:00 UTC)
├── data/
│   ├── questions/                # Curated question banks by topic
│   │   ├── devops.json
│   │   ├── golang.json
│   │   ├── nodejs.json
│   │   ├── sre.json
│   │   ├── tools.json
│   │   ├── architecture.json
│   │   └── incident.json
│   └── state/
│       ├── active_drill.json     # Tracks the active question between morning & evening
│       └── history.json          # Tracks completed question IDs to prevent repeats
├── src/
│   ├── config.js                 # Configuration & environment variables
│   ├── ai.js                     # Gemini API client for situational alerts & tips
│   ├── engine.js                 # Domain rotation, question selection & message formatting
│   ├── whatsapp.js               # CallMeBot & Twilio dispatchers with WhatsApp markdown
│   └── index.js                  # CLI entrypoint
├── package.json
└── README.md
```

---

## ✍️ Adding More Questions

To add your own scenarios, simply edit any JSON file in `data/questions/<topic>.json` and add a new object:

```json
{
  "id": "devops-004",
  "title": "Your Scenario Title",
  "domain": "DevOps & Containers",
  "difficulty": "Advanced",
  "scenario": "A description of the production issue...",
  "question": "What caused this and how do you fix it?",
  "hints": [
    "Hint 1",
    "Hint 2"
  ],
  "answer": "Detailed technical explanation...",
  "pitfalls": "Common mistaken assumptions...",
  "key_takeaway": "One-line operational rule of thumb"
}
```
Commit and push to GitHub — the pipeline will automatically include it in the rotation.
