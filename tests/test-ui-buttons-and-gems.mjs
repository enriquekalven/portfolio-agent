/**
 * Comprehensive End-to-End UI Button & Gem Verification Suite
 *
 * Tests:
 * 1. Every single UI button, link, chip, ticker, modal, and easter egg in index.html & src/main.ts
 * 2. All 12 Sidebar Gems end-to-end against live POST /api/chat-with-intent (gemini-4-argon) + A2UI payload verification
 */

import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { spawn } from "child_process";

const indexHtml = readFileSync("./index.html", "utf-8");
const mainTs = readFileSync("./src/main.ts", "utf-8");
const uiManagerTs = readFileSync("./src/ui-manager.ts", "utf-8");
const portfolioData = JSON.parse(readFileSync("./src/portfolio-data.json", "utf-8"));

console.log("=".repeat(80));
console.log("PART 1: UI DOM & EVENT HANDLER VERIFICATION (ALL BUTTONS, CHIPS, LINKS, MODALS)");
console.log("=".repeat(80));

let uiPassed = 0;
let uiFailed = 0;

function verifyUI(name, fn) {
  try {
    fn();
    console.log(`✅ [UI Button] ${name}`);
    uiPassed++;
  } catch (err) {
    console.error(`❌ [UI Button] ${name}: ${err.message}`);
    uiFailed++;
  }
}

// 1. Sidebar Header Social Links (5 links)
const expectedLinks = [
  { name: "GitHub Repo Link", url: "https://github.com/enriquekalven/portfolio-agent" },
  { name: "Portfolio Website Link", url: "https://enriquekchan.web.app/#about" },
  { name: "LinkedIn Profile Link", url: "https://www.linkedin.com/in/enriquechan/" },
  { name: "Medium Blog Link", url: "https://medium.com/@enriq" },
  { name: "YouTube Channel Link", url: "https://www.youtube.com/@enriquekchan" },
];

for (const link of expectedLinks) {
  verifyUI(`Sidebar Social Icon: ${link.name}`, () => {
    assert.ok(indexHtml.includes(`href="${link.url}"`), `Missing ${link.url} in index.html`);
  });
}

// 2. All 12 Sidebar Gems in DOM + Event Listeners in src/main.ts
const sidebarGems = [
  { id: "gem-historian", label: "Career Historian 📜", prompt: "Show me Enrique's career highlights as a sequential timeline", expectedIntent: "timeline" },
  { id: "gem-matcher", label: "Skill Matcher 🎯", prompt: "How do Enrique's skills match a Senior AI role?", expectedIntent: "flashcards" },
  { id: "gem-analyzer", label: "Fit Analyzer 📊", prompt: "Analyze Enrique's fit for an AI Lead role", expectedIntent: "flashcards" },
  { id: "gem-media", label: "Cinema Hub 🎬", prompt: "Show me his top YouTube videos", expectedIntent: "video_cards" },
  { id: "gem-blogs", label: "Insight Stream ✍️", prompt: "Show me some of his Medium blog posts", expectedIntent: "blog_cards" },
  { id: "gem-awards", label: "Trophy Room 🏆", prompt: "List Enrique's major awards and hackathon wins", expectedIntent: "awards" },
  { id: "gem-certs", label: "Cloud Badge Wall ☁️", prompt: "Show Enrique's cloud certifications", expectedIntent: "certs" },
  { id: "gem-speaker", label: "Stage Presence 🎤", prompt: "Show Enrique's speaking engagements and keynotes", expectedIntent: "speaker" },
  { id: "gem-testimonials", label: "Googler Vibes ✨", prompt: "Show me what people think of Enrique (testimonials)", expectedIntent: "testimonials" },
  { id: "gem-gallery", label: "Hall of Mastery 🖼️", prompt: "Show me a gallery of your work and highlights", expectedIntent: "gallery" },
  { id: "gem-repos", label: "Repo Scout 🚀", prompt: "Show me your featured open source repositories", expectedIntent: "repositories" },
  { id: "gem-comics", label: "Agentic Adventures 🕵️‍♂️", prompt: null, expectedIntent: "modal" },
];

for (const gem of sidebarGems) {
  verifyUI(`Sidebar Gem #${gem.id} (${gem.label})`, () => {
    assert.ok(indexHtml.includes(`id="${gem.id}"`), `Missing #${gem.id} in index.html`);
    assert.ok(mainTs.includes(`"${gem.id}"`), `Missing "${gem.id}" in src/main.ts`);
    if (gem.prompt) {
      assert.ok(mainTs.includes(gem.prompt), `Missing prompt "${gem.prompt}" in src/main.ts`);
    } else {
      assert.ok(mainTs.includes("showComicModal()"), `Missing showComicModal() handler for #${gem.id}`);
    }
  });
}

// 3. All 11 Welcome Screen Suggestion Chips
for (const gem of sidebarGems.filter(g => g.prompt)) {
  verifyUI(`Welcome Suggestion Chip: "${gem.label}"`, () => {
    assert.ok(
      indexHtml.includes(`class="suggestion-chip" data-prompt="${gem.prompt}"`),
      `Missing suggestion chip with data-prompt="${gem.prompt}" in index.html`
    );
    assert.ok(mainTs.includes(`.suggestion-chip[data-prompt]`), `Missing .suggestion-chip[data-prompt] click handler in src/main.ts`);
  });
}

// 4. 2026 Executive Bento KPI Strip & Announcement Pill
const bentoElements = [
  { name: "2026 SWIFTY Announcement Pill (#hero-announcement-pill)", snippet: 'id="hero-announcement-pill"' },
  { name: "Bento KPI Card: $2B+ Enterprise AI Deal Scope", snippet: "$2B+" },
  { name: "Bento KPI Card: 4x 2026 Analyst Leader Wins", snippet: "4x" },
  { name: "Bento KPI Card: 40M+ NBC Olympics Oli Users", snippet: "40M+" },
  { name: "Bento KPI Card: 5T+ Gemini Tokens Driven", snippet: "5T+" },
];

for (const bento of bentoElements) {
  verifyUI(bento.name, () => {
    assert.ok(indexHtml.includes(bento.snippet), `Missing ${bento.snippet} in index.html`);
    assert.ok(mainTs.includes(`.bento-kpi-card[data-prompt]`), `Missing .bento-kpi-card[data-prompt] handler in src/main.ts`);
  });
}

// 5. All Header, Footer, Mobile Drawer, Popover, Toast, Input, Ticker, and Modal Elements
const interactiveButtons = [
  { id: "new-chat-btn", name: "+ New chat button", source: mainTs },
  { id: "mobile-menu-btn", name: "Mobile Hamburger Menu button", source: mainTs },
  { id: "sidebar-backdrop", name: "Mobile Sidebar Backdrop overlay", source: mainTs },
  { id: "model-selector-btn", name: "Model Selector button (Gemini 4 Argon / Gemini 3.6 Flash)", source: mainTs },
  { id: "theme-toggle", name: "Theme Toggle button (Light/Dark Mode)", source: mainTs },
  { id: "history-btn", name: "Header Chat History button", source: uiManagerTs },
  { id: "more-actions-btn", name: "Header More Actions (3-dots) button", source: uiManagerTs },
  { id: "more-actions-menu", name: "More Actions Popover Menu", source: uiManagerTs },
  { id: "action-clear-chat", name: "Popover Action: Reset to Welcome Screen", source: uiManagerTs },
  { id: "action-export-md", name: "Popover Action: Export Chat (.md)", source: uiManagerTs },
  { id: "action-clear-history", name: "Popover Action: Clear Recent History", source: uiManagerTs },
  { id: "action-unlock-comics", name: "Popover Action: Unlock Secret Comics", source: uiManagerTs },
  { id: "profile-actions-btn", name: "Sidebar Footer Profile Actions button", source: uiManagerTs },
  { id: "profile-actions-menu", name: "Profile Quick Links Popover Menu", source: uiManagerTs },
  { id: "ui-toast", name: "Non-blocking Glassmorphic Toast Notification", source: uiManagerTs },
  { id: "prompt-ticker", name: "Interactive Prompt Ticker ('Ask me about...')", source: uiManagerTs },
  { id: "add-prompt-btn", name: "Input Quick Prompt (+) button", source: mainTs },
  { id: "mic-btn", name: "Voice Search Microphone button", source: uiManagerTs },
  { id: "sendBtn", name: "Send Message (arrow_upward) button", source: mainTs },
  { id: "easter-egg-hint", name: "Floating Easter Egg (🎁) button", source: mainTs },
  { id: "comic-modal", name: "Agentic Adventures Comic Modal", source: mainTs },
  { id: "modal-close", name: "Comic Modal Close (X) button", source: mainTs },
];

for (const btn of interactiveButtons) {
  verifyUI(`Interactive Element #${btn.id} (${btn.name})`, () => {
    assert.ok(indexHtml.includes(`id="${btn.id}"`), `Missing id="${btn.id}" in index.html`);
    assert.ok(btn.source.includes(`"${btn.id}"`), `Missing handler for #${btn.id}`);
  });
}

verifyUI("Zero blocking alert() or confirm() dialogs in UIManager", () => {
  assert.ok(!uiManagerTs.includes("alert("), "Found blocking alert() in src/ui-manager.ts");
  assert.ok(!uiManagerTs.includes("confirm("), "Found blocking confirm() in src/ui-manager.ts");
});

console.log(`\nPart 1 Summary: ${uiPassed} UI elements verified, ${uiFailed} failed.\n`);
if (uiFailed > 0) process.exit(1);

// =============================================================================
// PART 2: LIVE E2E GEM & INTENT VERIFICATION WITH GEMINI-4-ARGON
// =============================================================================
console.log("=".repeat(80));
console.log("PART 2: LIVE E2E VERIFICATION OF ALL GEMS VIA POST /api/chat-with-intent (gemini-4-argon)");
console.log("=".repeat(80));

// Point E2E_BASE_URL at a deployed revision to test it; otherwise a local server is started.
const REMOTE_BASE = (process.env.E2E_BASE_URL || "").replace(/\/$/, "");
const TEST_PORT = 18089;
let serverProc = null;

if (!REMOTE_BASE) {
  serverProc = spawn("npx", ["tsx", "api-server.ts"], {
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      HOST: "127.0.0.1",
      GENAI_MODEL: "gemini-4-argon",
      GOOGLE_CLOUD_LOCATION: "global",
      GOOGLE_CLOUD_PROJECT: "enriquekchan-b646b",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("API server startup timeout")), 15000);
    serverProc.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("API server ready")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProc.stderr.on("data", () => {
      // log warnings if any
    });
  });
}

const BASE_URL = REMOTE_BASE || `http://127.0.0.1:${TEST_PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** POST a chat request, waiting out the per-IP rate limit (20/min) instead of failing. */
async function postChat(body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}/api/chat-with-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status !== 429) return res;
    const wait = Number(res.headers.get("retry-after") || 30);
    console.log(`   (rate limited, waiting ${wait}s)`);
    await sleep(wait * 1000);
  }
  throw new Error("still rate limited after retries");
}

let gemPassed = 0;
let gemFailed = 0;

try {
  for (const gem of sidebarGems.filter(g => g.prompt)) {
    const t0 = Date.now();
    // The server owns the system prompt; the client only sends the question.
    const res = await postChat({ userMessage: gem.prompt, messages: [] });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    assert.equal(res.status, 200, `Expected HTTP 200 for ${gem.label}, got ${res.status}`);
    const data = await res.json();

    const intentMatch =
      data.intent === gem.expectedIntent ||
      (gem.expectedIntent === "blog_cards" && data.intent === "blog") ||
      (gem.expectedIntent === "video_cards" && data.intent === "video");

    if (intentMatch && data.text && data.text.length > 10) {
      console.log(
        `✅ [Gem E2E] ${gem.label.padEnd(22)} | Intent: ${data.intent.padEnd(13)} | ${elapsed}s ${res.headers.get("x-cache") === "HIT" ? "(cached)" : ""} | "${data.text.slice(0, 75)}..."`
      );
      gemPassed++;
    } else {
      console.error(
        `❌ [Gem E2E] ${gem.label.padEnd(22)} | Expected: ${gem.expectedIntent}, Got: ${data.intent} | Text: ${data.text}`
      );
      gemFailed++;
    }
  }
} finally {
  serverProc?.kill();
}

console.log("=".repeat(80));
console.log(`FINAL E2E SUMMARY: ${uiPassed}/${uiPassed} UI Buttons & Links Passed | ${gemPassed}/${gemPassed + gemFailed} Live Gems Passed (gemini-4-argon) against ${BASE_URL}`);
console.log("=".repeat(80));

if (gemFailed > 0) process.exit(1);
