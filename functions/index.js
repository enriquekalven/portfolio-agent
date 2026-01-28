import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { GoogleAuth } from "google-auth-library";
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";

dotenv.config();

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "enriquekchan-b646b";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL = process.env.GENAI_MODEL || "gemini-2.5-flash";

const AGENT_ENGINE_CONFIG = {
  projectNumber: process.env.AGENT_ENGINE_PROJECT_NUMBER || "1069572400509",
  location: process.env.AGENT_ENGINE_LOCATION || "us-central1",
  resourceId: process.env.AGENT_ENGINE_RESOURCE_ID || "8527457042774884352",
};

const auth = new GoogleAuth({
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

const vertex_ai = new VertexAI({ project: PROJECT, location: LOCATION });
const generativeModel = vertex_ai.getGenerativeModel({
  model: MODEL,
});

let cachedAccessToken = null;
async function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) return cachedAccessToken.token;
  try {
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (tokenResponse.token) {
      cachedAccessToken = { token: tokenResponse.token, expiresAt: now + 3000000 };
      return tokenResponse.token;
    }
  } catch (err) { logger.error("Token error", err); }
  return null;
}

const PORTFOLIO_BASE = "https://enriquekchan.web.app/";
const PORTFOLIO_SECTIONS = {
  "olympics": { slug: "#projects", title: "Olympic 'Oli' Chatbot" },
  "google": { slug: "#experience", title: "Google Cloud Career" },
  "aws": { slug: "#experience", title: "AWS Cloud Architecture" },
  "agent": { slug: "#publications", title: "Agentic AI Thought Leadership" },
  "a2ui": { slug: "#publications", title: "Building the Future of Agentic Interfaces" },
  "blog": { slug: "#publications", title: "Insight Stream (Medium Blogs)" },
  "video": { slug: "#publications", title: "Cinema Hub (YouTube Keynotes)" },
  "award": { slug: "#honors", title: "Trophy Room" },
  "timeline": { slug: "#experience", title: "Career Journey" },
  "default": { slug: "", title: "Enrique K Chan Portfolio" },
};

function getPortfolioSource(topic) {
  const topicLower = (topic || "").toLowerCase();
  for (const [keyword, section] of Object.entries(PORTFOLIO_SECTIONS)) {
    if (keyword !== "default" && topicLower.includes(keyword)) {
      return { provider: "Enrique K Chan Portfolio", title: section.title, url: PORTFOLIO_BASE + section.slug };
    }
  }
  return { provider: "Enrique K Chan Portfolio", title: "Career Highlights", url: PORTFOLIO_BASE };
}

async function queryAgentEngine(format, context = "") {
  const { projectNumber, location, resourceId } = AGENT_ENGINE_CONFIG;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectNumber}/locations/${location}/reasoningEngines/${resourceId}:streamQuery`;
  const accessToken = await getAccessToken();

  let message;
  if (format === "podcast" || format === "audio" || format === "video") {
    message = format === "video" ? "Play the video" : "Play the podcast";
  } else {
    // UPDATED: Match the prompt pattern used in the working local server
    message = context ? `Generate ${format} for: ${context}` : `Generate ${format}`;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        class_method: "stream_query",
        input: { user_id: "demo-user", message } 
      }),
    });

    if (!response.ok) throw new Error(`Agent Engine error: ${response.status}`);
    const responseText = await response.text();
    const chunks = responseText.trim().split("\n").filter(l => l.trim());

    let functionResponseResult = "";
    let textParts = "";

    for (const chunk of chunks) {
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.content?.parts) {
          for (const part of parsed.content.parts) {
            if (part.function_response?.response?.result) {
              functionResponseResult += part.function_response.response.result;
            } else if (part.text) {
              textParts += part.text;
            }
          }
        }
      } catch (e) { }
    }

    let fullText = functionResponseResult || textParts;
    let cleaned = fullText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // UPDATED: Robust A2UI extraction from api-server.ts logic
    const extractA2UI = (text) => {
      try {
        if (text.startsWith("[")) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return { a2ui: parsed };
        }
        if (text.startsWith("{")) {
          const wrapper = JSON.parse(text);
          if (wrapper.a2ui && Array.isArray(wrapper.a2ui)) return { a2ui: wrapper.a2ui, source: wrapper.source };
          if (wrapper.result) {
            const inner = typeof wrapper.result === 'string' ? JSON.parse(wrapper.result) : wrapper.result;
            if (inner.a2ui && Array.isArray(inner.a2ui)) return { a2ui: inner.a2ui, source: inner.source };
            if (Array.isArray(inner)) return { a2ui: inner };
          }
        }
        const arrayMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (arrayMatch) {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) return { a2ui: parsed };
        }
      } catch (e) { }
      return { a2ui: null };
    };

    const extracted = extractA2UI(cleaned);
    if (extracted.a2ui) {
      return {
        format,
        surfaceId: "portfolioContent",
        a2ui: extracted.a2ui,
        source: extracted.source || getPortfolioSource(context || format)
      };
    }
    return { format, surfaceId: "portfolioContent", a2ui: [], rawText: fullText };
  } catch (err) {
    logger.error("Agent Engine Request Failed", err);
    throw err;
  }
}

export const chat = onRequest({ timeoutSeconds: 300, memory: "1GiB", cors: true, invoker: "public" }, async (req, res) => {
  const path = req.path;
  logger.info(`Request path: ${path}`);

  try {
    if (path.includes("/health")) return res.json({ status: "healthy", project: PROJECT });

    if (path.includes("/chat")) {
      const isCombined = path.includes("/chat-with-intent");
      const body = req.body;

      let systemPrompt = body.systemPrompt;
      let userMessage = body.userMessage;

      if (isCombined) {
        // UPDATED: Inject Orchestration logic for combined endpoint (mirrors api-server.ts)
        systemPrompt += `
## RESPONSE FORMAT
You MUST respond with a valid JSON object. 
**CRITICAL**: DO NOT include any text, preamble, or markdown outside the JSON object.
DO NOT use filler phrases like "That's a great question" or "Let me think".
The format depends on the intent:

For content-generating intents (awards, certs, speaker, testimonials, timeline, flashcards, blog_cards, video_cards, podcast, video, quiz):
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
- general: questions about specific projects, technical details, or specific companies. Respond with FACTS.
- timeline: user explicitly wants to 'see', 'view', or 'visualize' the career journey, history, or timeline.
- awards: user asks for awards, honors, hackathons, or recognitions.
- certs: user asks for certifications or credentials.
- speaker: user asks for speaking engagements, keynotes, or Cloud Next.
- testimonials: user asks for what people say, feedback, or Googler quotes.
- flashcards: user wants "Skill Matcher", "Fit Analyzer", or highlights.
- blog_cards: user wants to see medium blogs or articles.
- video_cards: user wants to see youtube videos or a gallery.
- podcast: user wants audio content.
- video: user wants a single video message.
- quiz: user wants a quiz about Enrique.
- greeting: user is just saying hello/hi.

## RULES
- "Show me his speaking history" -> intent: "speaker", keywords: "Cloud Next, keynotes"
- "Analyze his fit for this role" -> intent: "flashcards", keywords: "Skill Matcher"
`;
        if (body.recentContext) {
          userMessage = `Recent conversation:\n${body.recentContext}\n\nCurrent message: "${body.userMessage}"`;
        }
      }

      const contents = (body.messages || []).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: m.parts }));
      contents.push({ role: "user", parts: [{ text: userMessage }] });

      const result = await generativeModel.generateContent({
        contents,
        generationConfig: {
          responseMimeType: isCombined ? "application/json" : "text/plain" 
        },
        systemInstruction: systemPrompt,
      });
      const response = await result.response;
      let text = response.candidates[0].content.parts[0].text;

      if (isCombined) {
        try {
          return res.json(JSON.parse(text));
        } catch (e) {
          logger.error("JSON Parse Error", text);
          return res.json({ intent: "general", text });
        }
      }
      return res.json({ text });
    }

    if (path.includes("/a2a/query")) {
      const body = req.body;
      const parts = (body.message || "flashcards").split(":");
      return res.json(await queryAgentEngine(parts[0].trim(), (parts[1] || "").trim()));
    }
    res.status(404).json({ error: "Not found", path });
  } catch (err) {
    logger.error("Error", err);
    res.status(500).json({ error: err.message });
  }
});
