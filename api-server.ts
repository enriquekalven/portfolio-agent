/*
 * API Server for Personalized Learning Demo
 *
 * Handles chat API requests using Gemini via VertexAI.
 * Also proxies A2A requests to Agent Engine.
 * Run with: npx tsx api-server.ts
 *
 * Required environment variables:
 *   GOOGLE_CLOUD_PROJECT - Your GCP project ID
 *   AGENT_ENGINE_PROJECT_NUMBER - Project number for Agent Engine
 *   AGENT_ENGINE_RESOURCE_ID - Resource ID of your deployed agent
 *
 * Optional environment variables:
 *   API_PORT - Server port (default: 8080)
 *   GOOGLE_CLOUD_LOCATION - GCP region (default: us-central1)
 *   GENAI_MODEL - Gemini model to use (default: gemini-2.5-flash)
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, statSync } from "fs";
import { join, resolve, sep, extname } from "path";
import { config } from "dotenv";
import { GoogleAuth } from "google-auth-library";
import { buildConciergeSystemPrompt, INTENT_CLASSIFIER_PROMPT, getIntentGuidance } from "./src/prompts";
import { checkSafety } from "./src/safety";
import { SUPPORTED_GEM_FORMATS } from "./src/gem-formats";

// Load environment variables
config();

// =============================================================================
// MESSAGE LOG - Captures all request/response traffic for demo purposes
// =============================================================================
const LOG_FILE = "./demo-message-log.json";
let messageLog: Array<{
  sequence: number;
  timestamp: string;
  direction: "CLIENT_TO_SERVER" | "SERVER_TO_AGENT" | "AGENT_TO_SERVER" | "SERVER_TO_CLIENT";
  endpoint: string;
  data: unknown;
}> = [];
let sequenceCounter = 0;

function logMessage(
  direction: "CLIENT_TO_SERVER" | "SERVER_TO_AGENT" | "AGENT_TO_SERVER" | "SERVER_TO_CLIENT",
  endpoint: string,
  data: unknown
) {
  const entry = {
    sequence: ++sequenceCounter,
    timestamp: new Date().toISOString(),
    direction,
    endpoint,
    data,
  };
  messageLog.push(entry);

  // Write to file after each message for real-time viewing
  writeFileSync(LOG_FILE, JSON.stringify(messageLog, null, 2));
  console.log(`[LOG] #${entry.sequence} ${direction} → ${endpoint}`);
}

function resetLog() {
  messageLog = [];
  sequenceCounter = 0;
  writeFileSync(LOG_FILE, "[]");
  console.log(`[LOG] Reset log file: ${LOG_FILE}`);
}

// Reset log on server start
resetLog();

// 🛡️ Safety Gate (per request): see src/safety.ts. It only scans the current visitor's own
// recent turns, which the client sends with each request; no state is shared across visitors.

const PORT = Number(process.env.PORT || 8080);
// Cloud Run requires listening on all interfaces; local runs stay on loopback.
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const HOST = process.env.HOST || (IS_PRODUCTION ? "0.0.0.0" : "127.0.0.1");
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
// Use global location for gemini-4-argon / gemini-3.6-flash on Vertex AI
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";
const MODEL = process.env.GENAI_MODEL || "gemini-4-argon";

// Models a visitor may pick in the UI's model selector. Anything else falls back to MODEL.
const ALLOWED_MODELS = new Set(
  (process.env.ALLOWED_MODELS || `${MODEL},gemini-3.6-flash`).split(",").map((m) => m.trim()).filter(Boolean)
);

function resolveModel(requested: unknown): string {
  return typeof requested === "string" && ALLOWED_MODELS.has(requested) ? requested : MODEL;
}

const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

// Validate required environment variables
if (!PROJECT) {
  console.error("ERROR: GOOGLE_CLOUD_PROJECT environment variable is required");
  process.exit(1);
}

// The system prompt is built here from the synced portfolio dataset. The browser used to send
// it with every request, which let any caller supply their own instructions instead.
const PORTFOLIO_DATA = JSON.parse(readFileSync(join(process.cwd(), "src", "portfolio-data.json"), "utf-8"));
const CONCIERGE_SYSTEM_PROMPT = buildConciergeSystemPrompt(PORTFOLIO_DATA);

// Agent Engine Configuration - set via environment variables
// See QUICKSTART.md for deployment instructions
// Note: Agent Engine is deployed in us-central1 (not global like Gemini API)
const AGENT_ENGINE_CONFIG = {
  projectNumber: process.env.AGENT_ENGINE_PROJECT_NUMBER || "",
  location: process.env.AGENT_ENGINE_LOCATION || "us-central1",
  resourceId: process.env.AGENT_ENGINE_RESOURCE_ID || "",
};
const AGENT_ENGINE_CONFIGURED = Boolean(AGENT_ENGINE_CONFIG.projectNumber && AGENT_ENGINE_CONFIG.resourceId);

// Gem visual cards come either from the Agent Engine or from the synced portfolio dataset that
// ships with the frontend. The mode is explicit so that a deploy which drops the Agent Engine
// variables fails at startup (and Cloud Run keeps serving the previous revision) instead of
// silently falling back on every request, which is what happened in revisions 00017-00018.
type GemContentSource = "agent-engine" | "static";

function resolveGemContentSource(): GemContentSource {
  const requested = (process.env.GEM_CONTENT_SOURCE || "").trim().toLowerCase();
  if (requested === "static") return "static";
  if (requested && requested !== "agent-engine") {
    console.error(`FATAL: GEM_CONTENT_SOURCE must be "agent-engine" or "static" (got "${requested}").`);
    process.exit(1);
  }
  if (AGENT_ENGINE_CONFIGURED || process.env.USE_LOCAL_AGENT === "TRUE") return "agent-engine";
  if (IS_PRODUCTION) {
    console.error("FATAL: AGENT_ENGINE_PROJECT_NUMBER and AGENT_ENGINE_RESOURCE_ID are not set.");
    console.error("       Set them, or set GEM_CONTENT_SOURCE=static to serve the synced dataset on purpose.");
    process.exit(1);
  }
  console.warn("WARNING: Agent Engine not configured; Gem cards will use the synced static dataset.");
  return "static";
}

const GEM_CONTENT_SOURCE = resolveGemContentSource();

// =============================================================================
// REQUEST LIMITS
// =============================================================================
// Per-IP and per-instance budgets for every endpoint that can trigger a model call.
// TODO(security): X-Forwarded-For can be spoofed, so the per-IP budget is best effort. The
// per-instance budget bounds total spend; Cloud Armor or API Gateway would enforce this upstream.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_IP = Number(process.env.RATE_LIMIT_PER_IP || 20);
const RATE_LIMIT_GLOBAL = Number(process.env.RATE_LIMIT_GLOBAL || 240);
const ipRequestLog = new Map<string, number[]>();
let globalRequestLog: number[] = [];

function takeRateLimitToken(ip: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  globalRequestLog = globalRequestLog.filter((t) => t > windowStart);
  const ipLog = (ipRequestLog.get(ip) || []).filter((t) => t > windowStart);
  ipRequestLog.set(ip, ipLog);

  const exhausted = ipLog.length >= RATE_LIMIT_PER_IP
    ? ipLog
    : globalRequestLog.length >= RATE_LIMIT_GLOBAL ? globalRequestLog : null;
  if (exhausted) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((exhausted[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)) };
  }

  ipLog.push(now);
  globalRequestLog.push(now);
  return { allowed: true };
}

setInterval(() => {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, log] of ipRequestLog) {
    if (!log.length || log[log.length - 1] <= cutoff) ipRequestLog.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const MAX_BODY_BYTES = 64 * 1024;
const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 2000;
const MAX_CONTEXT_CHARS = 3000;

/** Keeps only well-formed user/model turns, trimmed to a bounded size. */
function normalizeHistory(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-MAX_HISTORY_MESSAGES).flatMap((m: any) => {
    const role = m?.role === "assistant" || m?.role === "model" ? "model" : m?.role === "user" ? "user" : null;
    const text = Array.isArray(m?.parts)
      ? m.parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("\n").trim()
      : "";
    return role && text ? [{ role, parts: [{ text: text.slice(0, MAX_MESSAGE_CHARS) }] }] : [];
  });
}

function priorUserTexts(history: ChatMessage[]): string[] {
  return history.filter((m) => m.role === "user").map((m) => m.parts[0].text);
}

function isUpstreamRateLimit(error: any): boolean {
  return error?.status === 429 || /RESOURCE_EXHAUSTED|\b429\b/.test(String(error?.message || ""));
}

// =============================================================================
// FIRST-TURN RESPONSE CACHE
// =============================================================================
// With the system prompt fixed server-side, a first-turn answer (e.g. a Gem click) depends only
// on the model and the question. Caching it makes repeat clicks instant and cuts model spend.
const RESPONSE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const RESPONSE_CACHE_MAX = 300;
const UNCACHEABLE_INTENTS = new Set(["weather", "stock", "time"]);
const responseCache = new Map<string, { value: CombinedChatResponse; expiresAt: number }>();

function getCachedResponse(key: string): CombinedChatResponse | undefined {
  const entry = responseCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCachedResponse(key: string, value: CombinedChatResponse): void {
  responseCache.set(key, { value, expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS });
  while (responseCache.size > RESPONSE_CACHE_MAX) {
    const oldest = responseCache.keys().next().value;
    if (oldest === undefined) break;
    responseCache.delete(oldest);
  }
}

// =============================================================================
// RESPONSE HEADERS
// =============================================================================
// The frontend is served from this same origin, so cross-origin access is only needed for local
// development. The main portfolio (enriquekchan.web.app) neither embeds nor calls this service.
const ALLOWED_ORIGINS = new Set([
  "https://enriquekchan-concierge.web.app",
  "https://enriquekchan-concierge.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  ...(process.env.EXTRA_ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean),
]);

function applyResponseHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // The microphone stays enabled for this origin because the voice input button uses it.
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=(), microphone=(self)");
  // TODO(security): move to a nonce-based script-src/style-src policy. index.html still relies on
  // inline <style>/<script> blocks, Google Fonts, and YouTube embeds, which need an inventory first.
  res.setHeader("Content-Security-Policy", "object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}

function sendBlocked(res: ServerResponse, category: string): void {
  console.warn(`[SAFETY] Request blocked (category: ${category})`);
  sendJson(res, 400, {
    error: "blocked",
    message: "I can only help with questions about Enrique's career, projects, and work. Try asking about his awards, projects, or experience.",
  });
}

// =============================================================================
// Portfolio Source Attribution - Maps topics to specific portfolio sections
// =============================================================================
const PORTFOLIO_BASE = "https://enriquekchan-concierge.web.app/";

const PORTFOLIO_SECTIONS: Record<string, { slug: string; title: string }> = {
  "olympics": { slug: "#projects", title: "Olympic 'Oli' Chatbot" },
  "google": { slug: "#experience", title: "Google Cloud Career" },
  "aws": { slug: "#experience", title: "AWS Cloud Architecture" },
  "agent": { slug: "#publications", title: "Agentic AI Thought Leadership" },
  "a2ui": { slug: "#publications", title: "Building the Future of Agentic Interfaces" },
  "blog": { slug: "#publications", title: "Insight Stream (Medium Blogs)" },
  "video": { slug: "#publications", title: "Cinema Hub (YouTube Keynotes)" },
  "award": { slug: "#honors", title: "Trophy Room" },
  "timeline": { slug: "#experience", title: "Career Journey" },
  "matrix": { slug: "#publications", title: "Agentic Strategy Framework" },
  "creative": { slug: "#publications", title: "Strategic Integration Matrix" },
  "default": { slug: "", title: "Enrique K Chan Portfolio" },
};

function getPortfolioSource(topic: string): { provider: string; title: string; url: string } {
  const topicLower = topic.toLowerCase();

  for (const [keyword, section] of Object.entries(PORTFOLIO_SECTIONS)) {
    if (keyword !== "default" && topicLower.includes(keyword)) {
      return {
        provider: "Enrique K Chan Portfolio",
        title: section.title,
        url: PORTFOLIO_BASE + section.slug,
      };
    }
  }

  return {
    provider: "Enrique K Chan Portfolio",
    title: PORTFOLIO_SECTIONS["default"].title,
    url: PORTFOLIO_BASE,
  };
}

// Dynamic import for google genai (ESM)
let genai: any = null;

async function initGenAI() {
  const { GoogleGenAI } = await import("@google/genai");
  // Use VertexAI with Application Default Credentials
  const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI !== "FALSE";
  genai = new GoogleGenAI({
    vertexai: useVertex,
    project: PROJECT,
    location: LOCATION,
  });
  console.log(`[API Server] Using ${useVertex ? "VertexAI" : "Gemini API"}: ${PROJECT}/${LOCATION}`);
  console.log(`[API Server] Model: ${MODEL}`);
}

interface ChatMessage {
  role: string;
  parts: { text: string }[];
}

interface ChatRequest {
  intent: string;
  history: ChatMessage[];
  userMessage: string;
  model: string;
}

// =============================================================================
// ACCESS TOKEN CACHING
// =============================================================================
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

// Get Google Cloud access token with caching
// In Cloud Run, use the metadata server. Locally, use gcloud CLI.
async function getAccessToken(): Promise<string> {
  // Check cache first
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return cachedAccessToken.token;
  }

  // Try Google Auth library (ADC) - works in Cloud Run, GCE, etc.
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    if (token) {
      // Cache the token (typical expiry is 1 hour, we use 50 minutes to be safe)
      cachedAccessToken = {
        token: token,
        expiresAt: now + 3000000, // 50 minutes
      };
      console.log("[API Server] Obtained access token from Google Auth library");
      return token;
    }
  } catch (err) {
    console.log("[API Server] Google Auth library failed, trying metadata/CLI");
  }

  // Fallback 1: Metadata server (Cloud Run direct)
  try {
    const metadataUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
    const response = await fetch(metadataUrl, {
      headers: { "Metadata-Flavor": "Google" },
    });
    if (response.ok) {
      const data: any = await response.json();
      cachedAccessToken = {
        token: data.access_token,
        expiresAt: now + 3480000, // 58 minutes
      };
      console.log("[API Server] Obtained access token from metadata server");
      return data.access_token;
    }
  } catch {
    // Not in Cloud Run
  }

  // Fallback 2: gcloud CLI (local development)
  try {
    const token = execSync("gcloud auth print-access-token", {
      encoding: "utf-8",
    }).trim();
    cachedAccessToken = {
      token: token,
      expiresAt: now + 3480000, // 58 minutes
    };
    console.log("[API Server] Obtained access token from gcloud CLI");
    return token;
  } catch (error) {
    console.error("[API Server] All token methods failed:", error);
    throw new Error("Failed to get Google Cloud access token. Run: gcloud auth login");
  }
}

// Query Agent Engine for A2UI content using streamQuery
async function queryAgentEngine(format: string, context: string = ""): Promise<any> {
  // Support for local agent testing
  if (process.env.USE_LOCAL_AGENT === "TRUE") {
    const localUrl = `http://localhost:8081/a2a/query`;
    console.log(`[API Server] Querying LOCAL agent: ${format}`);

    const response = await fetch(localUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `${format}:${context}`,
        session_id: "local-test"
      }),
    });

    if (response.ok) {
      const result = await response.json();
      // Ensure source is present for the UI
      if (!result.source) {
        result.source = getPortfolioSource(context || format);
      }
      return result;
    }
    console.warn("[API Server] Local agent failed, falling back to remote");
  }

  const { projectNumber, location, resourceId } = AGENT_ENGINE_CONFIG;
  // Use :streamQuery endpoint with stream_query method for ADK agents
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${location}/reasoningEngines/${resourceId}:streamQuery`;

  const accessToken = await getAccessToken();

  // For audio/video, don't include topic context - we only have one pre-built podcast/video
  // Including a topic might confuse the agent into thinking we want topic-specific content
  let message: string;
  if (format === "podcast" || format === "audio" || format === "video") {
    message = format === "video" ? "Play the video" : "Play the podcast";
  } else {
    message = context ? `Generate ${format} for: ${context}` : `Generate ${format}`;
  }

  // Build the request payload
  const requestPayload = {
    class_method: "stream_query",
    input: {
      user_id: "demo-user",
      message: message,
    },
  };

  const startTime = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  const duration = Date.now() - startTime;
  console.log(`[API Server] Agent Engine response received in ${duration}ms (5th Golden Signal: Latency)`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[API Server] Agent Engine error:", errorText);
    throw new Error(`Agent Engine error: ${response.status}`);
  }

  // Parse the newline-delimited JSON response
  const responseText = await response.text();
  console.log("[API Server] Agent Engine response length:", responseText.length);
  console.log("[API Server] Raw response (first 1000 chars):", responseText.substring(0, 1000));

  // No raw logging here

  // Extract text from all chunks
  const chunks = responseText.trim().split("\n").filter((line: string) => line.trim());
  let fullText = "";

  let functionResponseResult = "";  // Prioritize function_response over text
  let textParts = "";

  for (const chunk of chunks) {
    try {
      const parsed = JSON.parse(chunk);
      console.log("[API Server] Parsed chunk keys:", Object.keys(parsed));

      // Extract from content.parts - can contain text, function_call, or function_response
      if (parsed.content?.parts) {
        for (const part of parsed.content.parts) {
          // Check for function_response which contains the tool result (prioritize this)
          if (part.function_response?.response?.result) {
            const result = part.function_response.response.result;
            console.log("[API Server] Found function_response result:", result.substring(0, 200));
            functionResponseResult += result;
          } else if (part.text) {
            console.log("[API Server] Found text part:", part.text.substring(0, 100));
            textParts += part.text;
          }
        }
      }
    } catch (e) {
      console.warn("[API Server] Failed to parse chunk:", chunk.substring(0, 100));
    }
  }

  // Prefer function_response result over text parts (agent text often just wraps the same data)
  fullText = functionResponseResult || textParts;

  console.log("[API Server] Extracted text:", fullText.substring(0, 300));

  // Try to parse A2UI JSON from the response
  try {
    // Strip markdown code blocks if present
    let cleaned = fullText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    console.log("[API Server] Cleaned text:", cleaned.substring(0, 200));

    // Helper to extract A2UI content and source info from various formats
    const extractA2UIWithSource = (text: string): { a2ui: unknown[] | null; source?: { url: string; title: string; provider: string } } => {
      // Try parsing as raw JSON array (legacy format)
      if (text.startsWith("[")) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return { a2ui: parsed };
        } catch { }
      }

      // Try parsing as object with a2ui and source (new format)
      if (text.startsWith("{")) {
        try {
          const wrapper = JSON.parse(text);
          // New format: {a2ui: [...], source: {...}}
          if (wrapper.a2ui && Array.isArray(wrapper.a2ui)) {
            return { a2ui: wrapper.a2ui, source: wrapper.source || undefined };
          }
          // Legacy format: {"result": "..."}
          if (wrapper.result) {
            const inner = typeof wrapper.result === 'string'
              ? JSON.parse(wrapper.result)
              : wrapper.result;
            // Check if inner is the new format
            if (inner && inner.a2ui && Array.isArray(inner.a2ui)) {
              return { a2ui: inner.a2ui, source: inner.source || undefined };
            }
            if (Array.isArray(inner)) return { a2ui: inner };
          }
        } catch { }
      }

      // Try to find and extract JSON array from text
      const arrayMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) return { a2ui: parsed };
        } catch { }
      }

      // Try to extract result field with regex and parse its content
      const resultMatch = text.match(/"result"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (resultMatch) {
        try {
          // Unescape the JSON string
          const unescaped = resultMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          const parsed = JSON.parse(unescaped);
          // Check if parsed is new format
          if (parsed && parsed.a2ui && Array.isArray(parsed.a2ui)) {
            return { a2ui: parsed.a2ui, source: parsed.source || undefined };
          }
          if (Array.isArray(parsed)) return { a2ui: parsed };
        } catch { }
      }

      return { a2ui: null };
    };

    const extracted = extractA2UIWithSource(cleaned);
    if (extracted.a2ui) {
      const result = {
        format,
        surfaceId: "portfolioContent",
        a2ui: extracted.a2ui,
        source: extracted.source,
      };

      // Parsed A2UI content ready

      return result;
    }

    // Return raw text if no JSON found
    return {
      format,
      surfaceId: "learningContent",
      a2ui: [],
      rawText: fullText,
    };
  } catch (e) {
    console.error("[API Server] Failed to parse agent response:", e);
    return {
      format,
      surfaceId: "portfolioContent",
      a2ui: [],
      rawText: fullText,
      error: "Failed to parse A2UI JSON",
    };
  }
}

/**
 * Generate QuizCard content locally using Gemini.
 * This is used when Agent Engine doesn't have QuizCard support.
 */
async function generateLocalQuiz(topic: string): Promise<any> {
  const systemPrompt = `You are creating interactive quiz questions about Enrique K Chan's professional background.

Create 2 interactive quiz questions about "${topic || 'Enrique\'s career'}" that:
1. Test the user's knowledge of Enrique's experience (Google, AWS, Olympics, etc.)
2. Include plausible wrong answers
3. Provide detailed explanations that highlight Enrique's expertise and professional growth
4. Use a professional, premium tone (inspired by Ali Abdaal)

Output ONLY valid JSON in this EXACT format (no markdown, no explanation):

[
  {"beginRendering": {"surfaceId": "portfolioContent", "root": "mainColumn"}},
  {
    "surfaceUpdate": {
      "surfaceId": "portfolioContent",
      "components": [
        {
          "id": "mainColumn",
          "component": {
            "Column": {
              "children": {"explicitList": ["headerText", "quizRow"]},
              "distribution": "start",
              "alignment": "stretch"
            }
          }
        },
        {
          "id": "headerText",
          "component": {
            "Text": {
              "text": {"literalString": "Quick Quiz: [TOPIC]"},
              "usageHint": "h3"
            }
          }
        },
        {
          "id": "quizRow",
          "component": {
            "Row": {
              "children": {"explicitList": ["quiz1", "quiz2"]},
              "distribution": "start",
              "alignment": "stretch"
            }
          }
        },
        {
          "id": "quiz1",
          "component": {
            "QuizCard": {
              "question": {"literalString": "[QUESTION 1]"},
              "options": [
                {"label": {"literalString": "[OPTION A]"}, "value": "a", "isCorrect": false},
                {"label": {"literalString": "[OPTION B - CORRECT]"}, "value": "b", "isCorrect": true},
                {"label": {"literalString": "[OPTION C]"}, "value": "c", "isCorrect": false},
                {"label": {"literalString": "[OPTION D]"}, "value": "d", "isCorrect": false}
              ],
              "explanation": {"literalString": "[DETAILED EXPLANATION WITH ANALOGY]"},
              "category": {"literalString": "[CATEGORY]"}
            }
          }
        },
        {
          "id": "quiz2",
          "component": {
            "QuizCard": {
              "question": {"literalString": "[QUESTION 2]"},
              "options": [
                {"label": {"literalString": "[OPTION A]"}, "value": "a", "isCorrect": false},
                {"label": {"literalString": "[OPTION B]"}, "value": "b", "isCorrect": false},
                {"label": {"literalString": "[OPTION C - CORRECT]"}, "value": "c", "isCorrect": true},
                {"label": {"literalString": "[OPTION D]"}, "value": "d", "isCorrect": false}
              ],
              "explanation": {"literalString": "[DETAILED EXPLANATION WITH ANALOGY]"},
              "category": {"literalString": "[CATEGORY]"}
            }
          }
        }
      ]
    }
  }
]

Replace all [BRACKETED] placeholders with actual content. Vary which option is correct.`;

  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: `Generate quiz questions about: ${topic || 'Enrique K Chan AI Architecture and Google Cloud career'}` }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "";
    console.log("[API Server] Local quiz generation response:", text.substring(0, 500));

    // Parse the JSON
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed = JSON.parse(cleaned);

    // Handle case where Gemini wraps the A2UI array in an object
    // We only want the A2UI messages array, not any wrapper object
    let a2ui: unknown[];
    if (Array.isArray(parsed)) {
      a2ui = parsed;
    } else if (parsed.a2ui && Array.isArray(parsed.a2ui)) {
      a2ui = parsed.a2ui;
    } else if (parsed.messages && Array.isArray(parsed.messages)) {
      a2ui = parsed.messages;
    } else {
      console.error("[API Server] Unexpected quiz format from Gemini:", Object.keys(parsed));
      return null;
    }

    // Match topic to specific portfolio section for better attribution
    const source = getPortfolioSource(topic);
    return {
      format: "quiz",
      surfaceId: "portfolioContent",
      a2ui: a2ui,
      source,
    };
  } catch (error) {
    console.error("[API Server] Local quiz generation failed:", error);
    return null;
  }
}

async function handleChatRequest(request: ChatRequest): Promise<{ text: string }> {
  const { intent, history, userMessage, model } = request;

  const response = await genai.models.generateContent({
    model,
    contents: [...history, { role: "user", parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: `${CONCIERGE_SYSTEM_PROMPT}\n\n${getIntentGuidance(intent)}`,
    },
  });

  return { text: response.text || "I apologize, I couldn't generate a response." };
}

async function handleClassifyRequest(userMessage: string, recentContext: string, model: string): Promise<{ text: string }> {
  const prompt = `Recent conversation:\n${recentContext}\n\nCurrent message: "${userMessage}"\n\nIntent:`;
  const response = await genai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { systemInstruction: INTENT_CLASSIFIER_PROMPT },
  });
  return { text: response.text || "general" };
}

// =============================================================================
// COMBINED INTENT + RESPONSE ENDPOINT
// Combines intent detection and response generation in a single LLM call
// =============================================================================
interface CombinedChatRequest {
  history: ChatMessage[];
  userMessage: string;
  recentContext: string;
  model: string;
}

interface CombinedChatResponse {
  intent: string;
  text: string;
  keywords?: string;  // Comma-separated keywords for content-generating intents
}

async function handleCombinedChatRequest(request: CombinedChatRequest): Promise<{ result: CombinedChatResponse; parsed: boolean }> {
  const { history, userMessage, recentContext, model } = request;

  const combinedSystemPrompt = `${CONCIERGE_SYSTEM_PROMPT}

## RESPONSE FORMAT
You MUST respond with a valid JSON object. 
**CRITICAL**: DO NOT include any text, preamble, or markdown outside the JSON object.
DO NOT use filler phrases like "That's a great question" or "Let me think".
The format depends on the intent:

For content-generating intents (awards, certs, speaker, testimonials, timeline, flashcards, blog_cards, video_cards, gallery, repositories, matrix, charts, bubble, podcast, video, quiz, weather, stock, time):
{
  "intent": "<the detected intent>",
  "text": "<your conversational response summarizing the specific facts>",
  "keywords": "<comma-separated portfolio keywords for content retrieval (e.g. 'Accenture', 'Vertex AI')>"
}

For non-content intents (greeting, general):
{
  "intent": "<greeting or general>",
  "text": "<your conversational response with specific data-driven facts>"
}

## INTENT CLASSIFICATION
Analyze the user's message and context to determine the most high-signal intent:
- general: questions about specific projects, technical details, or specific companies (e.g. 'What did he do at Accenture?'). Respond with FACTS.
- timeline: user explicitly wants to 'see', 'view', or 'visualize' the career journey, history, or sequential timeline ("Career Historian").
- awards: user asks for awards, honors, hackathons, or recognitions ("Trophy Room").
- certs: user asks for certifications or credentials ("Cloud Badge Wall" - Google Cloud, AWS, SAFe, Splunk).
- speaker: user asks for speaking engagements, keynotes, Build with Gemini, or Cloud Next ("Stage Presence").
- testimonials: user asks for what people think/say of Enrique, feedback, or Googler quotes ("Googler Vibes").
- flashcards: user wants "Skill Matcher", "Fit Analyzer", study cards, or career highlights.
- blog_cards: user wants to see Medium blog posts, whitepapers, or articles ("Insight Stream").
- video_cards: user wants to see YouTube videos ("Cinema Hub").
- gallery: user wants to see a gallery of work and highlights ("Hall of Mastery").
- repositories: user wants to see featured open source repositories or GitHub repos ("Repo Scout").
- matrix: user asks for the Strategic Integration Matrix or agentic workflow framework.
- charts: user asks for the technical proficiency radar or skill chart.
- podcast: user wants audio content or a podcast deep dive. Enrique doesn't have a podcast: say so in one sentence (don't suggest one is coming) and point to his recorded talks in the Cinema Hub.
- video: user wants a single video message.
- quiz: user wants a quiz or to be tested about Enrique.
- bubble: user wants 'bubble head' photos, pictures in bubbles, or profile visuals.
- weather: user asks about the weather, temperature, or conditions.
- stock: user asks for stock market data, market price, or GOOGL info.
- time: user asks for the current time, date, or clock status.
- greeting: user is just saying hello/hi.

## RULES
1. **Never Refuse Utility Requests**: If the user asks about the weather, stocks, time, or other utility functions, DO NOT refuse or say you only handle portfolio questions. Classify as 'weather', 'stock', or 'time'. 
2. **Strict Classification**: Utility requests (weather, stocks, time) MUST NEVER be classified as 'general'.
3. **Be Direct**: Provide facts first. acknowledgment should be brief.

## EXAMPLES
- "Show me Enrique's career highlights as a sequential timeline" → intent: "timeline", keywords: "Career Historian, Google Cloud Delta, AWS, Accenture"
- "How do Enrique's skills match a Senior AI role?" → intent: "flashcards", keywords: "Skill Matcher"
- "Analyze Enrique's fit for an AI Lead role" → intent: "flashcards", keywords: "Fit Analyzer"
- "Show me his top YouTube videos" → intent: "video_cards", keywords: "Cinema Hub, YouTube"
- "Show me some of his Medium blog posts" → intent: "blog_cards", keywords: "Insight Stream, Medium"
- "List Enrique's major awards and hackathon wins" → intent: "awards", keywords: "Trophy Room, SWIFTY, Gartner"
- "Show Enrique's cloud certifications" → intent: "certs", keywords: "Google Cloud, AWS, SAFe, Splunk"
- "Show Enrique's speaking engagements and keynotes" → intent: "speaker", keywords: "Google Cloud Next, Build with Gemini"
- "Show me what people think of Enrique (testimonials)" → intent: "testimonials", keywords: "Thomas Kurian, Michael Clark"
- "Show me a gallery of your work and highlights" → intent: "gallery", keywords: "Hall of Mastery, Projects"
- "Show me your featured open source repositories" → intent: "repositories", keywords: "GitHub, agentops-cockpit"
- "Show me the Strategic Integration Matrix" → intent: "matrix", keywords: "Strategic Integration Matrix"
- "Show me your technical proficiency radar" → intent: "charts", keywords: "Skill Radar"
- "What's the weather in Seattle?" → intent: "weather", keywords: "Seattle"
- "What is Google's stock price?" → intent: "stock", keywords: "GOOGL stock"
- "What time is it?" → intent: "time", keywords: "current time"
- "Show me bubble head photos" → intent: "bubble", keywords: "profile bubbles"

Then provide an appropriate conversational response highlighting the utility integration as part of your agentic capabilities.`;

  // Add recent context if provided
  const contextualMessage = recentContext
    ? `Recent conversation:\n${recentContext}\n\nCurrent message: "${userMessage}"`
    : userMessage;

  const response = await genai.models.generateContent({
    model,
    contents: [...history, { role: "user", parts: [{ text: contextualMessage }] }],
    config: {
      systemInstruction: combinedSystemPrompt,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text?.trim() || "";
  console.log("[API Server] Combined response:", responseText.substring(0, 200));

  try {
    const parsed = JSON.parse(responseText);
    const result: CombinedChatResponse = {
      intent: parsed.intent || "general",
      text: parsed.text || "I apologize, I couldn't generate a response.",
    };
    // Include keywords if present (for content-generating intents)
    if (parsed.keywords) {
      result.keywords = parsed.keywords;
      console.log("[API Server] Keywords for content retrieval:", parsed.keywords);
    }
    return { result, parsed: Boolean(parsed.text) };
  } catch (parseError) {
    console.error("[API Server] Failed to parse combined response:", parseError);
    // Fallback: return general intent with raw text
    return {
      result: { intent: "general", text: responseText || "I apologize, I couldn't generate a response." },
      parsed: false,
    };
  }
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk: Buffer) => {
      if (rejected) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejected = true;
        reject(new HttpError(413, "payload_too_large", "Request body is too large."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (rejected) return;
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf-8") || "{}");
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        reject(new HttpError(400, "invalid_json", "Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

// =============================================================================
// STATIC FILES
// =============================================================================
// Only the Vite build output is public. The server used to fall back to the repository root,
// which exposed source files, eval artifacts, and a local ADK session database to anyone.
const DIST_DIR = resolve(process.cwd(), "dist");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function resolveStaticFile(rawUrl: string): string | null {
  let pathname: string;
  try {
    // The URL parser collapses "." and ".." segments before we decode the path.
    pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = resolve(DIST_DIR, relativePath);
  // Enforce the boundary with a trailing separator so a sibling like "dist-old" can't match.
  if (!candidate.startsWith(DIST_DIR + sep)) return null;

  try {
    return statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

function cacheControlFor(filePath: string): string {
  if (filePath.endsWith(".html")) return "no-cache";
  // Vite fingerprints bundles (e.g. main-BgX2gcjW.js), so they can be cached for a year.
  if (/[\\/]assets[\\/][^\\/]+-[A-Za-z0-9_-]{8}\.(js|css)$/.test(filePath)) return "public, max-age=31536000, immutable";
  return "public, max-age=3600";
}

const MODEL_ROUTES = new Set(["POST /api/chat", "POST /api/chat-with-intent", "POST /a2ui-agent/a2a/query", "GET /warmup"]);

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

async function main() {
  console.log("[API Server] Initializing Gemini client...");
  await initGenAI();

  const server = createServer(async (req, res) => {
    applyResponseHeaders(req, res);
    const pathname = (req.url || "/").split("?")[0];

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health check
      if (pathname === "/health" && req.method === "GET") {
        sendJson(res, 200, {
          status: "healthy",
          model: MODEL,
          gemContentSource: GEM_CONTENT_SOURCE,
          agentEngineConfigured: AGENT_ENGINE_CONFIGURED,
        });
        return;
      }

      if (MODEL_ROUTES.has(`${req.method} ${pathname}`)) {
        const limit = takeRateLimitToken(getClientIp(req));
        if (!limit.allowed) {
          sendJson(
            res,
            429,
            { error: "rate_limited", message: "Too many requests. Please wait a moment and try again." },
            { "Retry-After": String(limit.retryAfterSeconds) }
          );
          return;
        }
      }

      // Warmup endpoint - triggers Agent Engine to prevent cold starts
      if (pathname === "/warmup" && req.method === "GET") {
        if (GEM_CONTENT_SOURCE === "static") {
          sendJson(res, 200, { status: "warm", gemContentSource: GEM_CONTENT_SOURCE });
          return;
        }
        console.log("[API Server] Warmup triggered...");
        await queryAgentEngine("flashcards", "warmup");
        sendJson(res, 200, { status: "warm", engineResponse: "active" });
        return;
      }

      // A2A Agent Engine endpoint
      if (pathname === "/a2ui-agent/a2a/query" && req.method === "POST") {
        const body = await parseBody(req);
        const safety = checkSafety(readString(body.message));
        if (!safety.ok) {
          sendBlocked(res, safety.category);
          return;
        }

        // Parse format from message (e.g., "flashcards:context" or just "flashcards")
        const [rawFormat = "", ...rest] = safety.text.split(":");
        const format = rawFormat.trim().toLowerCase();
        const context = rest.join(":").trim();
        if (!SUPPORTED_GEM_FORMATS.has(format)) {
          sendJson(res, 400, { error: "unsupported_format", message: "Unsupported content format." });
          return;
        }
        console.log(`[API Server] A2UI request: format=${format}, source=${GEM_CONTENT_SOURCE}, keywords="${context.slice(0, 120)}"`);

        if (GEM_CONTENT_SOURCE === "static") {
          // Quizzes are still generated live; other Gem cards render from the synced dataset in the client.
          const quiz = format === "quiz" ? await generateLocalQuiz(context) : null;
          sendJson(res, 200, quiz ?? { format, surfaceId: "portfolioContent", a2ui: [], mode: "static" });
          return;
        }

        let result = await queryAgentEngine(format, context);

        // If quiz was requested but Agent Engine returned Flashcards or empty,
        // generate quiz locally using Gemini
        if (format === "quiz") {
          const a2uiStr = JSON.stringify(result.a2ui || []);
          const hasFlashcards = a2uiStr.includes("Flashcard");
          const hasQuizCards = a2uiStr.includes("QuizCard");
          const isEmpty = !result.a2ui || result.a2ui.length === 0;

          if (isEmpty || (hasFlashcards && !hasQuizCards)) {
            console.log("[API Server] Agent Engine doesn't support QuizCard, generating locally");
            const localQuiz = await generateLocalQuiz(context);
            if (localQuiz) {
              result = localQuiz;
            }
          }
        }

        sendJson(res, 200, result);
        return;
      }

      // Chat endpoint - fallback path used when the combined endpoint fails
      if (pathname === "/api/chat" && req.method === "POST") {
        const body = await parseBody(req);
        const history = normalizeHistory(body.messages);
        const safety = checkSafety(readString(body.userMessage), priorUserTexts(history));
        if (!safety.ok) {
          sendBlocked(res, safety.category);
          return;
        }
        const model = resolveModel(body.model);
        const recentContext = readString(body.recentContext).slice(-MAX_CONTEXT_CHARS);

        const result = body.mode === "classify"
          ? await handleClassifyRequest(safety.text, recentContext, model)
          : await handleChatRequest({ intent: readString(body.intent) || "general", history, userMessage: safety.text, model });

        sendJson(res, 200, result);
        return;
      }

      // Combined chat endpoint - performs intent detection AND response in one LLM call
      if (pathname === "/api/chat-with-intent" && req.method === "POST") {
        const body = await parseBody(req);
        const history = normalizeHistory(body.messages);
        const safety = checkSafety(readString(body.userMessage), priorUserTexts(history));
        if (!safety.ok) {
          sendBlocked(res, safety.category);
          return;
        }
        const model = resolveModel(body.model);
        const recentContext = readString(body.recentContext).slice(-MAX_CONTEXT_CHARS);
        console.log(`[API Server] Combined chat request (history: ${history.length}, model: ${model})`);

        // Not "X-Cache": Firebase Hosting's CDN appends its own X-Cache value (e.g. "HIT, MISS").
        const cacheKey = history.length === 0 && !recentContext ? `${model}::${safety.text.trim().toLowerCase()}` : null;
        const cached = cacheKey ? getCachedResponse(cacheKey) : undefined;
        if (cached) {
          sendJson(res, 200, cached, { "X-Concierge-Cache": "HIT" });
          return;
        }

        const { result, parsed } = await handleCombinedChatRequest({ history, userMessage: safety.text, recentContext, model });
        if (cacheKey && parsed && !UNCACHEABLE_INTENTS.has(result.intent)) {
          setCachedResponse(cacheKey, result);
        }
        console.log(`[API Server] Intent: ${result.intent} | Keywords: ${result.keywords || "(none)"}`);
        sendJson(res, 200, result, { "X-Concierge-Cache": "MISS" });
        return;
      }

      // Static files for the frontend (dist/ only)
      if (req.method === "GET" || req.method === "HEAD") {
        const filePath = resolveStaticFile(req.url || "/");
        if (filePath) {
          const content = readFileSync(filePath);
          res.writeHead(200, {
            "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
            "Cache-Control": cacheControlFor(filePath),
          });
          res.end(req.method === "HEAD" ? undefined : content);
          return;
        }
      }

      sendJson(res, 404, { error: "not_found" });
    } catch (error: any) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: error.code, message: error.message });
        return;
      }
      if (isUpstreamRateLimit(error)) {
        console.warn("[API Server] Model quota exhausted:", error?.message);
        sendJson(
          res,
          503,
          { error: "model_unavailable", message: "The model is busy right now. Please try again shortly." },
          { "Retry-After": "10" }
        );
        return;
      }
      // Details go to the logs; clients get a generic message so internals aren't exposed.
      console.error(`[API Server] ${req.method} ${pathname} failed:`, error);
      sendJson(res, 500, { error: "internal_error", message: "Something went wrong. Please try again." });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`[API Server] Running on http://${HOST}:${PORT} (Gem content: ${GEM_CONTENT_SOURCE})`);
    console.log(`\n✅ API server ready\n`);
  });
}

main().catch(console.error);
