import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { GoogleAuth } from "google-auth-library";
import { VertexAI } from "@google-cloud/vertexai";
import dotenv from "dotenv";

dotenv.config();

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "enriquekchan-b646b";
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
function getPortfolioSource(topic) {
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
    message = context ? `${format}:${context}` : format;
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
    let fullText = "";
    for (const chunk of chunks) {
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.content?.parts) {
          for (const part of parsed.content.parts) {
            fullText += (part.function_response?.response?.result || part.text || "");
          }
        }
      } catch (e) { }
    }
    let cleaned = fullText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const a2ui = parsed.a2ui || (Array.isArray(parsed) ? parsed : null);
      if (a2ui) return { format, surfaceId: "portfolioContent", a2ui, source: parsed.source || getPortfolioSource(context || format) };
    } catch (e) { }
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
      const contents = (body.messages || []).map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: m.parts }));
      contents.push({ role: "user", parts: [{ text: body.userMessage }] });

      const result = await generativeModel.generateContent({
        contents,
        generationConfig: {
          responseMimeType: isCombined ? "application/json" : "text/plain"
        },
        systemInstruction: body.systemPrompt,
      });
      const response = await result.response;
      const text = response.candidates[0].content.parts[0].text;
      return res.json(isCombined ? JSON.parse(text) : { text });
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
