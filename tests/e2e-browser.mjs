/**
 * Real-browser E2E test for the concierge UI (headless Chrome via the DevTools protocol).
 *
 * Usage: node tests/e2e-browser.mjs [baseUrl]
 *        (default: http://127.0.0.1:8080, or E2E_BASE_URL)
 * Env:   CHROME_PATH    override the Chrome binary
 *        E2E_SKIP_CHAT  set to 1 to skip steps that call the model (e.g. without credentials)
 *
 * Unlike tests/test-ui-buttons-and-gems.mjs, which only checks that IDs and strings exist in the
 * source, this clicks real elements in a real browser and asserts on the resulting DOM state.
 * No npm dependencies: it talks to Chrome over Node's built-in WebSocket.
 */
import { spawn } from "child_process";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const BASE = (process.argv[2] || process.env.E2E_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const SKIP_CHAT = process.env.E2E_SKIP_CHAT === "1";
const CHROME = process.env.CHROME_PATH || [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("Chrome not found. Set CHROME_PATH.");
  process.exit(2);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const debugPort = 9300 + Math.floor(Math.random() * 500);
const profileDir = mkdtempSync(join(tmpdir(), "concierge-e2e-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${debugPort}`,
  "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1366,900",
  "about:blank",
], { stdio: "ignore" });

function cleanup() {
  try { chrome.kill(); } catch { /* already exited */ }
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* best effort */ }
}

// --- Minimal DevTools protocol client -------------------------------------------------------
class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = [];
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.listeners.forEach((listener) => listener(msg));
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(listener) {
    this.listeners.push(listener);
  }
}

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) break;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  return new DevTools(socket);
}

let devtools;
const pageErrors = [];

async function evaluate(expression) {
  const result = await devtools.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch { /* page may be navigating */ }
    await sleep(150);
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for: ${expression}`);
}

async function open(path = "/") {
  await devtools.send("Page.navigate", { url: BASE + path });
  await waitFor("document.readyState === 'complete' && !!document.getElementById('chatInput')", 30000);
  await sleep(400);
}

const click = (selector) => evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) throw new Error("element not found: " + ${JSON.stringify(selector)});
  el.click();
  return true;
})()`);

const pressKey = (key, selector = null) => evaluate(`(() => {
  const target = ${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document"};
  target.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(key)}, bubbles: true }));
  return true;
})()`);

// --- Test harness ----------------------------------------------------------------------------
let passed = 0;
let failed = 0;
let skipped = 0;

async function test(name, fn, { needsModel = false } = {}) {
  if (needsModel && SKIP_CHAT) {
    console.log(`⏭️  ${name} (skipped: E2E_SKIP_CHAT=1)`);
    skipped++;
    return;
  }
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Tests -----------------------------------------------------------------------------------
try {
  devtools = await connect();
  devtools.on((msg) => {
    if (msg.method === "Runtime.exceptionThrown") {
      const details = msg.params.exceptionDetails;
      pageErrors.push(details.exception?.description || details.text);
    }
  });
  await devtools.send("Runtime.enable");
  await devtools.send("Page.enable");

  console.log(`Browser E2E against ${BASE}\n`);
  await open("/");
  await evaluate("localStorage.clear(); true");
  await open("/");

  await test("welcome screen renders 12 Gems, 4 Bento cards, and the announcement pill", async () => {
    const state = await evaluate(`({
      welcome: !!document.querySelector(".welcome-screen"),
      gems: document.querySelectorAll('[id^="gem-"]').length,
      bento: document.querySelectorAll(".bento-kpi-card").length,
      pill: !!document.getElementById("hero-announcement-pill"),
    })`);
    assert(state.welcome && state.gems === 12 && state.bento === 4 && state.pill, JSON.stringify(state));
  });

  await test("toast shows a message when the theme is toggled, and the theme survives a reload", async () => {
    await click("#theme-toggle");
    const toast = await evaluate(`({
      visible: document.getElementById("ui-toast").classList.contains("visible"),
      text: document.getElementById("ui-toast").textContent.trim(),
      light: document.body.classList.contains("light-mode"),
    })`);
    assert(toast.visible && toast.text.length > 0, `toast not shown: ${JSON.stringify(toast)}`);
    await open("/");
    const lightAfterReload = await evaluate(`document.body.classList.contains("light-mode")`);
    assert(lightAfterReload === toast.light, "theme did not persist across reload");
    await click("#theme-toggle");
  });

  await test("More Actions popover toggles aria-expanded and closes on Escape", async () => {
    await click("#more-actions-btn");
    const opened = await evaluate(`({
      open: document.getElementById("more-actions-menu").classList.contains("open"),
      expanded: document.getElementById("more-actions-btn").getAttribute("aria-expanded"),
    })`);
    assert(opened.open && opened.expanded === "true", JSON.stringify(opened));
    await pressKey("Escape");
    const closed = await evaluate(`document.getElementById("more-actions-menu").classList.contains("open")`);
    assert(!closed, "popover still open after Escape");
  });

  await test("custom controls are keyboard reachable (role=button, tabindex=0)", async () => {
    const unreachable = await evaluate(`[...document.querySelectorAll(
      ".bento-kpi-card, #hero-announcement-pill, .suggestion-chip, #model-selector-btn"
    )].filter((el) => el.getAttribute("role") !== "button" || el.tabIndex !== 0).length`);
    assert(unreachable === 0, `${unreachable} controls are not keyboard reachable`);
  });

  await test("model selector switches the model and remembers it", async () => {
    await click("#model-selector-btn");
    const state = await evaluate(`({
      label: document.getElementById("model-selector-label").textContent,
      saved: localStorage.getItem("enriq_model"),
    })`);
    assert(state.label.includes("Flash") && state.saved === "gemini-3.6-flash", JSON.stringify(state));
    await open("/");
    const restored = await evaluate(`document.getElementById("model-selector-label").textContent`);
    assert(restored.includes("Flash"), `model choice not restored (label: ${restored})`);
    await click("#model-selector-btn");
  });

  await test("comics modal links all 5 issues to enriquekchan.web.app and closes on Escape", async () => {
    await click("#more-actions-btn");
    await click("#action-unlock-comics");
    await waitFor(`document.getElementById("comic-modal").classList.contains("active")`);
    const comics = await evaluate(`({
      links: [...document.querySelectorAll("#comic-list a.comic-item")].map((a) => a.href),
      images: document.querySelectorAll("#comic-list img").length,
    })`);
    assert(comics.links.length === 5, `expected 5 issues, got ${comics.links.length}`);
    assert(comics.links.every((href) => href.startsWith("https://enriquekchan.web.app/agent_adventures_")), comics.links.join(", "));
    assert(comics.images === 0, "comic tiles still reference images");
    await pressKey("Escape");
    await waitFor(`!document.getElementById("comic-modal").classList.contains("active")`);
  });

  await test("mobile drawer opens with a visible backdrop and closes when the backdrop is tapped", async () => {
    await devtools.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(300);
    await click("#mobile-menu-btn");
    await sleep(350);
    const opened = await evaluate(`(() => {
      const backdrop = document.getElementById("sidebar-backdrop");
      const style = getComputedStyle(backdrop);
      return {
        sidebar: document.getElementById("app-sidebar").classList.contains("open"),
        backdropShown: style.display !== "none" && Number(style.opacity) > 0,
        expanded: document.getElementById("mobile-menu-btn").getAttribute("aria-expanded"),
      };
    })()`);
    assert(opened.sidebar && opened.backdropShown && opened.expanded === "true", JSON.stringify(opened));
    await click("#sidebar-backdrop");
    const closed = await evaluate(`!document.getElementById("app-sidebar").classList.contains("open")`);
    assert(closed, "drawer did not close when the backdrop was tapped");
    await devtools.send("Emulation.clearDeviceMetricsOverride");
  });

  await test("Bento card responds to the Enter key", async () => {
    await open("/");
    await evaluate(`document.querySelector(".bento-kpi-card").focus(); true`);
    await pressKey("Enter", ".bento-kpi-card");
    await waitFor(`document.querySelectorAll(".message.user").length === 1`, 5000);
    await waitFor(`!document.querySelector(".typing-indicator")`, 120000);
  }, { needsModel: true });

  await test("a Gem click renders a live answer with cards, follow-ups, and a copy button", async () => {
    await open("/");
    await click("#gem-awards");
    await waitFor(`document.querySelectorAll(".message.user").length === 1`);

    // A second click while the first answer is in flight must be ignored.
    await click("#gem-certs");
    const userMessages = await evaluate(`document.querySelectorAll(".message.user").length`);
    assert(userMessages === 1, `overlapping request was not blocked (${userMessages} user messages)`);

    await waitFor(`document.querySelector(".message.assistant .followup-chips")`, 120000);
    const answer = await evaluate(`(() => {
      const message = document.querySelector(".message.assistant");
      return {
        text: message.querySelector(".message-text").textContent.trim(),
        followups: message.querySelectorAll(".followup-chip").length,
        copyButton: !!message.querySelector(".copy-msg-btn"),
        cards: !!message.querySelector(".a2ui-container"),
      };
    })()`);
    assert(answer.text.length > 20 && !/error processing/i.test(answer.text), `answer: ${answer.text.slice(0, 100)}`);
    assert(answer.followups === 3, `expected 3 follow-up chips, got ${answer.followups}`);
    assert(answer.copyButton, "copy button missing");
    assert(answer.cards, "Gem cards (A2UI) did not render");
  }, { needsModel: true });

  await test("a follow-up chip continues the conversation with context", async () => {
    await click(".message.assistant .followup-chip");
    await waitFor(`document.querySelectorAll(".message.user").length === 2`);
    await waitFor(`document.querySelectorAll(".message.assistant .followup-chips").length === 2`, 120000);
    const reply = await evaluate(`[...document.querySelectorAll(".message.assistant")].pop().querySelector(".message-text").textContent.trim()`);
    assert(reply.length > 20 && !/error processing/i.test(reply), `reply: ${reply.slice(0, 100)}`);
  }, { needsModel: true });

  await test("no uncaught page errors", async () => {
    assert(pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  });
} catch (err) {
  console.error(`Fatal: ${err.message}`);
  failed++;
} finally {
  cleanup();
}

console.log(`\nBrowser E2E: ${passed} passed, ${failed} failed, ${skipped} skipped`);
process.exit(failed > 0 ? 1 : 0);
