# Nudge
**MVP Product Requirements Document**
Version 1.0 · June 2026 · Personal Project

| Status | Stage | Platform | Author |
|--------|-------|----------|--------|
| Draft | MVP | Firefox/Zen · Windows → Mac | Personal |

---

## 1. The Problem

Two things happen most evenings. You open LinkedIn, Reddit, or TikTok meaning to spend five minutes, and thirty minutes disappear. Somewhere in the back of your mind you know there are people you have been meaning to call — a friend whose message you read and forgot to reply to, a family member you keep meaning to ring. The two facts are related. The time lost to doomscrolling is time that could have gone toward relationships that matter.

Existing solutions handle each problem in isolation. Screen time apps track usage but do not redirect you toward anything meaningful. Relationship reminder apps (Garden, Amato, Monica) send scheduled notifications on a fixed cadence — every two weeks, every month — which quickly start to feel like a maintenance checklist rather than a genuine prompt to connect.

> **The core insight:** A nudge feels natural when it intercepts time you were already wasting and redirects it toward someone you already wanted to reach out to. It is not adding a new obligation — it is replacing a low-value activity with a high-value one at exactly the right moment.

---

## 2. Goals for the MVP

### What success looks like

The MVP is successful if, after two weeks of use, you have reached out to at least one person per week that you would not have contacted otherwise. That is the only metric that matters at this stage.

### What the MVP is not trying to do

- Measure whether your relationships are improving
- Track screen time comprehensively
- Replace iMessage, Gmail, or any other communication tool
- Work on your phone (phone is a later version)

---

## 3. The User Flow

The entire experience from detection to action looks like this:

| Step | What happens |
|------|-------------|
| 1. Land on a wasteful site | You open Reddit, LinkedIn, TikTok, or Instagram in Zen Browser. |
| 2. Wait X minutes | The extension waits silently. Short intentional visits are not interrupted. |
| 3. Nudge appears | A popup surfaces one person with context: why them, why now. |
| 4a. You act on it | You click "Reach out" and the extension logs the outcome. |
| 4b. You need to stay | You type "I'm choosing to focus" to snooze for 15 minutes. |
| 5. Snooze expires | The timer resets and the cycle begins again on the next visit. |

> **Why the commitment phrase instead of a one-click dismiss:** Typing "I'm choosing to focus" introduces just enough friction to break autopilot. A single click is too easy to dismiss without awareness. The phrase forces a moment of conscious decision — you are owning the choice to stay, which is very different from reflexively closing a notification.

---

## 4. Features

### 4.1 Wasteful site detection

The extension monitors which URL is active in your browser. When you land on a site from your personal blocklist and stay for longer than the configured threshold, the nudge is triggered.

| Decision | Rationale |
|----------|-----------|
| Option A: flag any visit to the site | Simple to build, low false-negative rate. Risk: fires during legitimate research sessions. |
| Option B: detect doomscrolling behaviour | Smarter but requires tracking scroll velocity, session length, tab switching — weeks of tuning work. |
| **Chosen: Option A with a time buffer** | A 5–10 minute delay before the nudge fires filters out intentional short visits without any complex logic. |

**Configurable settings:**
- Blocklist of wasteful sites (you define it)
- Time-on-site threshold before nudge fires (default: 5 minutes)
- Snooze duration after commitment phrase (default: 15 minutes)

### 4.2 Person selection

When the nudge fires, the extension picks one person to surface. The selection logic is simple and rule-based for the MVP — no machine learning, no scoring model. It uses a priority order:

- **Highest priority — open promise:** You told someone you'd text them back and haven't
- **Second priority — overdue thread:** Gmail metadata shows an unanswered message older than two weeks
- **Third priority — long time no contact:** Someone on your people list with no logged contact in over a month

Only one person is shown per nudge. Showing a list would recreate the chore feeling — a single name with a reason feels like a thought, not a task.

### 4.3 Gmail integration

Gmail is used only to detect unanswered threads. No message content is ever read, stored, or sent anywhere. The extension pulls only metadata: sender name, date, and whether you have replied.

> **Security note:** Gmail requires OAuth authentication, which involves a round trip to Google's servers. This is unavoidable. However, all processing happens locally on your machine after that. No data is sent to any third party, no LLM processes your messages, and no content is stored beyond a local log of nudge events.

### 4.4 Local data storage

Everything the extension knows lives in `browser.storage.local` — a sandboxed key-value store that only your extension can access.

| Data stored | Purpose |
|-------------|---------|
| `people.json` | Your list of contacts and their preferred contact cadence |
| `nudgeLog` | Timestamped record of every nudge: who was shown, whether you acted on it or snoozed |
| `snoozedUntil` | Timestamp of the current snooze window |
| `currentNudge` | The person currently being surfaced (cleared after action) |

The `nudgeLog` is the seed of the analytics layer you will build in a later version. By logging every event now, you will have real data to analyse without having built a dashboard prematurely.

---

## 5. Tradeoffs We Considered

| Decision | Alternative considered | Why we chose this path |
|----------|----------------------|----------------------|
| Firefox/Zen extension | Chrome extension | You use Zen Browser (Firefox-based) day-to-day. Building for Firefox means the extension works natively in Zen without any workarounds. Chrome and Firefox share the WebExtensions standard so the skills transfer directly. |
| `browser.*` API with polyfill | `chrome.*` API | Firefox uses `browser.*` which returns Promises. Using Mozilla's `webextension-polyfill` lets you write `browser.*` once and have it work on both Firefox and Chrome if needed later. |
| Load via `about:debugging` | `web-ext run` CLI tool | `web-ext` requires knowing the Firefox/Zen binary path from WSL, which adds friction. `about:debugging` → Load Temporary Add-on is one click and works identically. `web-ext` becomes useful later for automated testing and publishing. |
| Windows first, Mac later | Wait for Mac before building | The Firefox extension works identically on Windows and Mac. Waiting a month to start is unnecessary. iMessage becomes an additive data source after the Mac switch. |
| Gmail metadata only | Full message content via LLM | Reading content introduces serious privacy risk. Metadata (sender, date, replied?) is sufficient to detect an open loop without ever exposing what was said. |
| Fixed blocklist | ML-based doomscroll detection | Detecting doomscrolling requires signals that are hard to define. A blocklist you control is transparent, fast to build, and easy to adjust. |
| One person per nudge | Show a list of overdue contacts | A list feels like a to-do queue. One name with a reason feels like a thought that surfaced naturally. |
| Commitment phrase snooze | One-click dismiss button | A click is too frictionless. The phrase forces a conscious decision and makes it harder to dismiss on autopilot. |
| Local storage only | Cloud sync across devices | Cloud sync introduces a server to build and maintain, and a place where your relationship data could be exposed. For a personal tool, local is simpler and safer. |

---

## 6. Architecture

A Firefox extension is just a folder of files that the browser loads directly. There is no server, no deployment, no build pipeline to start with. You load the folder via `about:debugging` and it works.

### 6.1 The three components

| Component | What it does |
|-----------|-------------|
| `content.js` (Content Script) | Runs inside the webpage you are visiting. Detects which site you are on and reports it to the background worker. Cannot do anything else on its own. |
| `background.js` (Background Script) | The brain. Runs in the background at all times. Receives messages from the content script, manages the timer, decides when to fire a nudge, and reads from / writes to local storage. Note: in Firefox MV3 this is declared as a `scripts` array rather than Chrome's `service_worker`. |
| `popup.html` + `popup.js` (Popup UI) | The window that appears when the nudge fires. Shows the person's name and the reason. Contains the commitment phrase input and the reach-out button. |

### 6.2 How the components talk to each other

The three components cannot call each other directly. They communicate by sending messages — similar to how microservices in a data pipeline communicate via events rather than direct function calls. This is a pattern you will see throughout data engineering.

| Message | From → To |
|---------|-----------|
| `WASTEFUL_SITE_DETECTED` | `content.js` → `background.js` (sent as soon as you land on a blocklisted site) |
| `LEFT_WASTEFUL_SITE` | `content.js` → `background.js` (sent when you navigate away, cancels the timer) |
| `SHOW_NUDGE` | `background.js` → `content.js` (timer expired, time to show the popup) |
| `FOCUS_MODE_ACTIVATED` | `popup.js` → `background.js` (commitment phrase matched, start snooze) |
| `NUDGE_ACTED_ON` | `popup.js` → `background.js` (reach-out button clicked, log the event) |

### 6.3 Firefox vs Chrome API differences

The WebExtensions standard is shared between Firefox and Chrome, but there are two small differences relevant to this project:

| Area | Chrome | Firefox |
|------|--------|---------|
| Namespace | `chrome.*` | `browser.*` |
| Style | Callbacks | Promises |
| Background script | `"service_worker": "background.js"` | `"scripts": ["background.js"]` |
| Fix | — | Use `webextension-polyfill` to write `browser.*` once, works on both |

### 6.4 File structure

```
nudge-extension/
├── manifest.json       ← tells Firefox what the extension is and what permissions it needs
├── background.js       ← the brain: timers, message handling, storage reads and writes
├── content.js          ← watches which site you are on, sends messages to background.js
├── popup.html          ← the nudge UI: person name, reason, reach-out button, phrase input
├── popup.js            ← logic for the popup: reads storage, handles clicks and phrase input
└── people.json         ← your personal list of contacts — stored locally, never leaves your machine
```

### 6.5 manifest.json structure (Firefox MV3)

```json
{
  "manifest_version": 3,
  "name": "Nudge",
  "version": "1.0",
  "permissions": [
    "storage",
    "tabs",
    "alarms"
  ],
  "background": {
    "scripts": ["background.js"]
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.reddit.com/*",
        "*://*.linkedin.com/*",
        "*://*.tiktok.com/*",
        "*://*.instagram.com/*"
      ],
      "js": ["browser-polyfill.js", "content.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html"
  }
}
```

### 6.6 Loading the extension in Zen

1. Open Zen and navigate to `about:debugging`
2. Click **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on"**
4. Navigate to your extension folder and select `manifest.json`
5. After any code change in nvim, click the **reload icon** on the extension card

The extension stays loaded until you close Zen. Re-load it the same way next session. This is the standard development workflow — no `web-ext` needed.

---

## 7. Out of Scope for MVP

| Feature | When it becomes relevant |
|---------|-------------------------|
| iMessage integration | After switching to Mac — the iMessage database is a local SQLite file readable with Python. Add as a second data source for person selection. |
| Analytics dashboard | Version 3 — only meaningful once you have weeks of nudge log data. The log is being built now. |
| Smarter doomscroll detection | Version 2 — once you have dismissal patterns from the log, you can start tuning the detection heuristic. |
| Phone / mobile support | Firefox for Android supports WebExtensions, so this is more feasible than iOS. Still out of scope for MVP. |
| Cloud sync | Only relevant if you have multiple devices. Adds server complexity and privacy risk. |
| Publishing to Firefox Add-ons | Requires signing through Mozilla. Relevant only when you want others to use it. |

---

## 8. Suggested Build Order

Build in this sequence so you have something working at every stage:

| Step | Deliverable |
|------|-------------|
| 1. Manifest + skeleton | A loadable extension that does nothing yet — proves your file structure is correct and Zen accepts it |
| 2. Site detection | Content script detects you are on Reddit and logs a message to the browser console |
| 3. Timer in background | Background script starts a timer on detection, logs when it expires |
| 4. Popup UI | A hardcoded nudge popup appears when the timer fires |
| 5. People list | `people.json` is loaded and a real name appears in the nudge |
| 6. Commitment phrase | Typing the phrase in the popup snoozes the extension |
| 7. Nudge logging | Every nudge event is written to `browser.storage.local` |
| 8. Gmail integration | OAuth flow added, unanswered threads surface as nudge candidates |

> **A note on learning:** Each step in this build order teaches a distinct concept: file structure, DOM events, async timers, message passing, local storage, and finally API authentication. By the time you reach Step 8 you will have touched most of the core patterns that appear in data engineering and backend development — just at a smaller scale.

---

## 9. How This Builds Your Data Skills

This project was chosen partly because it is a genuine problem to solve, and partly because the concepts map directly to the data pipeline and product data science skills you are developing.

| Concept in this project | Equivalent in data engineering |
|------------------------|-------------------------------|
| Message passing between components | Event-driven architecture, Kafka topics, pub/sub patterns |
| `browser.storage.local` reads and writes | Key-value store (Redis, DynamoDB) |
| `nudgeLog` with timestamps | Event table in a data warehouse — the foundation of all product analytics |
| Gmail metadata extraction | API ingestion, ELT, pulling from a source system |
| Person selection priority logic | Business logic layer, dbt models, transformation rules |
| Snooze timer state management | Stateful stream processing, session windows |
| Dismissal vs. action outcomes | Conversion funnel, experiment outcomes, A/B test events |
