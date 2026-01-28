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

import { createServer } from "http";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { GoogleAuth } from "google-auth-library";

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

const PORT = parseInt(process.env.PORT || process.env.API_PORT || "8080");
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
// Use us-central1 region for consistency with Agent Engine
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL = process.env.GENAI_MODEL || "gemini-2.5-flash";

const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

// Validate required environment variables
if (!PROJECT) {
  console.error("ERROR: GOOGLE_CLOUD_PROJECT environment variable is required");
  process.exit(1);
}

// Agent Engine Configuration - set via environment variables
// See QUICKSTART.md for deployment instructions
// Note: Agent Engine is deployed in us-central1 (not global like Gemini API)
const AGENT_ENGINE_CONFIG = {
  projectNumber: process.env.AGENT_ENGINE_PROJECT_NUMBER || "",
  location: process.env.AGENT_ENGINE_LOCATION || "us-central1",
  resourceId: process.env.AGENT_ENGINE_RESOURCE_ID || "",
};

if (!AGENT_ENGINE_CONFIG.projectNumber || !AGENT_ENGINE_CONFIG.resourceId) {
  console.warn("WARNING: AGENT_ENGINE_PROJECT_NUMBER and AGENT_ENGINE_RESOURCE_ID not set.");
  console.warn("         Agent Engine features will not work. See QUICKSTART.md for setup.");
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
  systemPrompt: string;
  intentGuidance: string;
  messages: ChatMessage[];
  userMessage: string;
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

  console.log(`[API Server] Querying Agent Engine: ${format}`);
  console.log(`[API Server] URL: ${url}`);

  // Build the request payload
  const requestPayload = {
    class_method: "stream_query",
    input: {
      user_id: "demo-user",
      message: message,
    },
  };

  // No logging here

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

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
      contents: [{ role: "user", parts: [{ text: `Generate quiz questions about: ${topic || 'ATP and bond energy'}` }] }],
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
  const { systemPrompt, intentGuidance, messages, userMessage } = request;

  // Build the full system instruction
  const fullSystemPrompt = `${systemPrompt}\n\n${intentGuidance}`;

  // Convert messages to Gemini format
  const messagesList = messages || [];
  const contents = messagesList.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.parts,
  }));

  // Add the current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: fullSystemPrompt,
      },
    });

    const text = response.text || "I apologize, I couldn't generate a response.";
    return { text };
  } catch (error) {
    console.error("[API Server] Error calling Gemini:", error);
    throw error;
  }
}

// =============================================================================
// COMBINED INTENT + RESPONSE ENDPOINT
// Combines intent detection and response generation in a single LLM call
// =============================================================================
interface CombinedChatRequest {
  systemPrompt: string;
  messages: ChatMessage[];
  userMessage: string;
  recentContext?: string;
}

interface CombinedChatResponse {
  intent: string;
  text: string;
  keywords?: string;  // Comma-separated keywords for content-generating intents
}

async function handleCombinedChatRequest(request: CombinedChatRequest): Promise<CombinedChatResponse> {
  const { systemPrompt, messages, userMessage, recentContext } = request;

  const combinedSystemPrompt = `${systemPrompt}

## RESPONSE FORMAT
You MUST respond with a valid JSON object. 
**CRITICAL**: DO NOT include any text, preamble, or markdown outside the JSON object.
DO NOT use filler phrases like "That's a great question" or "Let me think".
The format depends on the intent:

For content-generating intents (awards, certs, speaker, testimonials, timeline, flashcards, blog_cards, video_cards, podcast, video, quiz, weather, stock, time):
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
- timeline: user explicitly wants to 'see', 'view', or 'visualize' the career journey, history, or timeline.
- awards: user asks for awards, honors, hackathons, or recognitions (Default to this for trophy requests).
- certs: user asks for certifications or credentials. (Google, AWS, Azure).
- speaker: user asks for speaking engagements, keynotes, or Cloud Next.
- testimonials: user asks for what people say, feedback, or Googler quotes.
- flashcards: user wants "Skill Matcher", "Fit Analyzer", or highlights.
- blog_cards: user wants to see medium blogs or articles.
- video_cards: user wants to see youtube videos or a gallery.
- podcast: user wants audio content.
- video: user wants a single video message.
- quiz: user wants a quiz about Enrique.
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
- "What's the weather?" → intent: "weather", keywords: "seattle weather"
- "How do his skills match a Senior AI role?" → intent: "flashcards", keywords: "Skill Matcher"
- "Analyze his fit for an AI Lead role" → intent: "flashcards", keywords: "Fit Analyzer"
- "What is Google's stock price?" → intent: "stock", keywords: "GOOGL stock"
- "What's the weather in Seattle?" → intent: "weather", keywords: "Seattle"
- "What time is it?" → intent: "time", keywords: "current time"
- "Show me bubble head photos" → intent: "bubble", keywords: "profile bubbles"
- "Show me his cloud certs" → intent: "certs", keywords: "Google Cloud, AWS, Azure"

Then provide an appropriate conversational response highlighting the utility integration as part of your agentic capabilities.`;

  // Convert messages to Gemini format
  const messagesList = messages || [];
  const contents = messagesList.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.parts,
  }));

  // Add recent context if provided
  let contextualMessage = userMessage;
  if (recentContext) {
    contextualMessage = `Recent conversation:\n${recentContext}\n\nCurrent message: "${userMessage}"`;
  }

  contents.push({
    role: "user",
    parts: [{ text: contextualMessage }],
  });

  try {
    const response = await genai.models.generateContent({
      model: MODEL,
      contents,
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
      return result;
    } catch (parseError) {
      console.error("[API Server] Failed to parse combined response:", parseError);
      // Fallback: return general intent with raw text
      return {
        intent: "general",
        text: responseText || "I apologize, I couldn't generate a response.",
      };
    }
  } catch (error) {
    console.error("[API Server] Error calling Gemini for combined request:", error);
    throw error;
  }
}

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function main() {
  console.log("[API Server] Initializing Gemini client...");
  await initGenAI();

  const server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy" }));
      return;
    }

    // Endpoints removed

    // A2A Agent Engine endpoint
    if (req.url === "/a2ui-agent/a2a/query" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        console.log("[API Server] ========================================");
        console.log("[API Server] A2A QUERY - REQUESTING A2UI CONTENT");
        console.log("[API Server] Full message:", body.message);
        console.log("[API Server] Session ID:", body.session_id);
        console.log("[API Server] ========================================");

        // No logging

        // Parse format from message (e.g., "flashcards:context" or just "flashcards")
        const parts = (body.message || "flashcards").split(":");
        const format = parts[0].trim();
        const context = parts.slice(1).join(":").trim();

        console.log("[API Server] Parsed format:", format);
        console.log("[API Server] Parsed context (keywords):", context);
        console.log("[API Server] This context will be sent to Agent Engine for topic matching");

        let result = await queryAgentEngine(format, context);

        // If quiz was requested but Agent Engine returned Flashcards or empty,
        // generate quiz locally using Gemini
        if (format.toLowerCase() === "quiz") {
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

        // No logging

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error: any) {
        console.error("[API Server] A2A error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Chat endpoint
    if (req.url === "/api/chat" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        console.log("[API Server] Chat request received");

        // No logging

        const result = await handleChatRequest(body);

        // No logging

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error: any) {
        console.error("[API Server] Error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Combined chat endpoint - performs intent detection AND response in one LLM call
    if (req.url === "/api/chat-with-intent" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        console.log("[API Server] ========================================");
        console.log("[API Server] COMBINED CHAT REQUEST RECEIVED");
        console.log("[API Server] User message:", body.userMessage);
        console.log("[API Server] Conversation history length:", body.messages?.length || 0);
        console.log("[API Server] ========================================");

        // No logging

        const result = await handleCombinedChatRequest(body);

        console.log("[API Server] ========================================");
        console.log("[API Server] GEMINI COMBINED RESPONSE:");
        console.log("[API Server] Intent:", result.intent);
        console.log("[API Server] Keywords:", result.keywords || "(none - not a content intent)");
        console.log("[API Server] Text:", result.text.substring(0, 200));
        console.log("[API Server] ========================================");

        // No logging

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error: any) {
        console.error("[API Server] Combined chat error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Static file serving for frontend
    const MIME_TYPES: Record<string, string> = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    // Serve static files (Vite builds to dist/, but index.html is in root for dev)
    if (req.method === "GET") {
      let filePath = req.url === "/" ? "/index.html" : req.url || "/index.html";

      // Remove query string
      filePath = filePath.split("?")[0];

      // Try dist/ first (production build), then root (development)
      const distPath = join(process.cwd(), "dist", filePath);
      const rootPath = join(process.cwd(), filePath);

      const fullPath = existsSync(distPath) ? distPath : rootPath;

      if (existsSync(fullPath)) {
        try {
          const content = readFileSync(fullPath);
          const ext = filePath.substring(filePath.lastIndexOf("."));
          const contentType = MIME_TYPES[ext] || "application/octet-stream";

          res.writeHead(200, { "Content-Type": contentType });
          res.end(content);
          return;
        } catch (err) {
          // Fall through to 404
        }
      }
    }

    // 404 for other routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
    console.log(`\n✅ API server ready\n`);
  });
}

main().catch(console.error);
