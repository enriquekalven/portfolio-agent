/*
 * Chat Orchestrator
 *
 * Orchestrates the chat flow between the user, Gemini, and the A2A agent.
 * Determines when to generate A2UI content and manages async artifact generation.
 */

import { A2UIRenderer } from "./a2ui-renderer";
import { A2AClient } from "./a2a-client";
import { getIdToken } from "./firebase-auth";
import { renderMarkdown } from "./markdown";

// Helper to get auth headers for API requests
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = await getIdToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// Types for conversation history
interface Message {
  role: "user" | "assistant";
  content: string;
  a2ui?: unknown[];
}

// Intent types the orchestrator can detect
type Intent =
  | "flashcards"
  | "podcast"
  | "audio"
  | "video"
  | "video_cards"
  | "blog"
  | "image"
  | "quiz"
  | "bubble"
  | "awards"
  | "certs"
  | "speaker"
  | "testimonials"
  | "timeline"
  | "gallery"
  | "blog_cards"
  | "video_cards"
  | "creative"
  | "charts"
  | "radar"
  | "weather"
  | "stock"
  | "repositories"
  | "general"
  | "greeting";

/** A message to show the visitor instead of an answer (rate limited or out-of-scope request). */
class ApiNoticeError extends Error {
  constructor(public notice: string) {
    super(notice);
  }
}

/** The model is temporarily unavailable (e.g. quota exhausted); answer from local data instead. */
class ModelUnavailableError extends Error {}

export const DEFAULT_MODEL = "gemini-4-argon";

export class ChatOrchestrator {
  private conversationHistory: Message[] = [];
  private renderer: A2UIRenderer;
  private a2aClient: A2AClient;
  private model: string = DEFAULT_MODEL;

  constructor(renderer: A2UIRenderer) {
    this.renderer = renderer;
    this.a2aClient = new A2AClient();
  }

  /** Model used for chat answers. The server only honors models on its allow-list. */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Process a user message and generate a response.
   * Uses combined intent+response endpoint to reduce latency.
   */
  async processMessage(
    userMessage: string,
    messageElement: HTMLDivElement
  ): Promise<void> {
    // Add to history
    this.conversationHistory.push({ role: "user", content: userMessage });

    // Try combined endpoint first (single LLM call for intent + response + keywords)
    let intent: Intent;
    let responseText: string;
    let keywords: string | undefined;

    console.log("========================================");
    console.log("[Orchestrator] PROCESSING USER MESSAGE");
    console.log(`[Orchestrator] User said: "${userMessage}"`);
    console.log("========================================");

    try {
      const combinedResult = await this.getCombinedIntentAndResponse(userMessage);
      intent = combinedResult.intent as Intent;
      responseText = combinedResult.text;
      keywords = combinedResult.keywords;
      console.log("========================================");
      console.log("[Orchestrator] GEMINI RESPONSE RECEIVED");
      console.log(`[Orchestrator] Detected intent: ${intent}`);
      console.log(`[Orchestrator] Keywords: ${keywords || "(none)"}`);
      console.log(`[Orchestrator] Response text: ${responseText.substring(0, 100)}...`);
      console.log("========================================");
    } catch (error) {
      if (error instanceof ApiNoticeError) {
        // Rate-limited or blocked: show the notice and drop the turn so it isn't replayed as context.
        this.conversationHistory.pop();
        this.setMessageText(messageElement, error.notice);
        return;
      }
      if (error instanceof ModelUnavailableError) {
        // The model is out of quota; answer from local data without making more model calls.
        console.warn("[Orchestrator] Model unavailable, using keyword routing and synced content");
        intent = this.detectIntentKeyword(userMessage);
        responseText = this.getFallbackResponse(intent).text;
      } else {
        console.warn("[Orchestrator] Combined endpoint failed, falling back to separate calls");
        // Fallback to separate calls if combined endpoint fails
        intent = await this.detectIntentWithLLM(userMessage);
        console.log(`[Orchestrator] Fallback detected intent: ${intent}`);
        const response = await this.generateResponse(userMessage, intent);
        responseText = response.text;
      }
    }

    // Update the message element with the response text
    this.setMessageText(messageElement, responseText);
    this.addCopyButton(messageElement, responseText);

    // If we need A2UI content, fetch and render it
    if (intent !== "greeting") {
      // Add processing placeholder
      const placeholder = this.addProcessingPlaceholder(
        messageElement,
        intent
      );

      try {
        // Fetch A2UI content from the agent
        // Use LLM-generated keywords if available (handles typos, adds related terms)
        // Fall back to user message + response context if keywords not available
        const topicContext = keywords
          ? keywords  // Keywords are already corrected and expanded by Gemini
          : `User request: ${userMessage}\nAssistant context: ${responseText}`;

        console.log("========================================");
        console.log("[Orchestrator] CALLING AGENT ENGINE FOR A2UI CONTENT");
        console.log(`[Orchestrator] Intent (format): ${intent}`);
        console.log(`[Orchestrator] Topic context being sent:`);
        console.log(`[Orchestrator]   "${topicContext}"`);
        console.log(`[Orchestrator] Keywords available: ${keywords ? "YES" : "NO (using fallback)"}`);
        console.log("========================================");

        const a2uiResult = await this.a2aClient.generateContent(
          intent,
          topicContext
        );

        console.log("========================================");
        console.log("[Orchestrator] AGENT ENGINE RESPONSE RECEIVED");
        console.log(`[Orchestrator] Format: ${a2uiResult?.format}`);
        console.log(`[Orchestrator] Source: ${JSON.stringify(a2uiResult?.source)}`);
        console.log(`[Orchestrator] A2UI messages: ${a2uiResult?.a2ui?.length || 0}`);
        console.log("========================================");

        // Remove placeholder
        placeholder.remove();

        // Render A2UI content with source attribution
        if (a2uiResult && a2uiResult.a2ui) {
          this.renderer.render(messageElement, a2uiResult.a2ui, a2uiResult.source);
          this.conversationHistory[this.conversationHistory.length - 1].a2ui =
            a2uiResult.a2ui;

          // Add JSON schema viewer
          this.addJsonViewer(messageElement, a2uiResult.a2ui);
        }
      } catch (error) {
        console.error("[Orchestrator] Error fetching A2UI content:", error);
        placeholder.replaceChildren();
        const errIcon = document.createElement("span");
        errIcon.className = "material-symbols-outlined";
        errIcon.style.color = "#f87171";
        errIcon.textContent = "error";
        const errText = document.createElement("span");
        errText.className = "text";
        errText.textContent = "Failed to load content. Please try again.";
        placeholder.append(errIcon, errText);
      }
    }

    // Add contextual follow-up suggestion chips
    this.addFollowupChips(messageElement, intent);

    // Add assistant response to history
    this.conversationHistory.push({ role: "assistant", content: responseText });
  }

  /**
   * Get combined intent and response in a single LLM call.
   * This reduces latency by eliminating one round-trip.
   * For content-generating intents, also returns keywords for better content retrieval.
   */
  private async getCombinedIntentAndResponse(message: string): Promise<{ intent: string; text: string; keywords?: string }> {
    // The current message is the last history entry; it's sent once, as userMessage.
    const priorTurns = this.conversationHistory.slice(0, -1);
    const recentContext = priorTurns.slice(-4).map(m =>
      `${m.role}: ${m.content}`
    ).join("\n");

    const response = await fetch("/api/chat-with-intent", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        messages: priorTurns.slice(-10).map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
        userMessage: message,
        recentContext,
        model: this.model,
      }),
    });

    if (response.status === 429) {
      throw new ApiNoticeError("You're sending messages quickly. Please wait a few seconds and try again.");
    }
    if (response.status === 400) {
      const body = await response.json().catch(() => ({}));
      if (body?.error === "blocked") {
        throw new ApiNoticeError(body.message || "I can only help with questions about Enrique's career and work.");
      }
    }
    if (response.status === 503) {
      throw new ModelUnavailableError("Model unavailable");
    }
    if (!response.ok) {
      throw new Error(`Combined API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Detect the user's intent using Gemini LLM.
   * Returns the detected intent for routing to appropriate content generation.
   */
  private async detectIntentWithLLM(message: string): Promise<Intent> {
    // The server owns the classifier prompt; we only send the question and recent context.
    const recentContext = this.conversationHistory.slice(0, -1).slice(-4).map(m =>
      `${m.role}: ${m.content}`
    ).join("\n");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          mode: "classify",
          userMessage: message,
          recentContext,
          model: this.model,
        }),
      });

      if (!response.ok) {
        console.warn("[Orchestrator] Intent API failed, falling back to keyword detection");
        return this.detectIntentKeyword(message);
      }

      const data = await response.json();
      const intentText = (data.text || "general").toLowerCase().trim();

      // Map response to valid intent
      if (intentText.includes("flashcard")) return "flashcards";
      if (intentText.includes("blog") || intentText.includes("article") || intentText.includes("whitepaper") || intentText.includes("insight")) return "blog";
      if (intentText.includes("video") || intentText.includes("youtube") || intentText.includes("cinema")) return "video_cards";
      if (intentText.includes("quiz")) return "quiz";
      if (intentText.includes("award")) return "awards";
      if (intentText.includes("cert")) return "certs";
      if (intentText.includes("speaker") || intentText.includes("speaking")) return "speaker";
      if (intentText.includes("testimonial") || intentText.includes("people say")) return "testimonials";
      if (intentText.includes("timeline") || intentText.includes("journey")) return "timeline";
      if (intentText.includes("gallery")) return "gallery";
      if (intentText.includes("greeting")) return "greeting";
      if (intentText.includes("weather")) return "weather";
      if (intentText.includes("stock") || intentText.includes("market")) return "stock";
      if (intentText.includes("repository") || intentText.includes("repo") || intentText.includes("open source")) return "repositories";

      return "general";
    } catch (error) {
      console.error("[Orchestrator] Intent detection error:", error);
      return this.detectIntentKeyword(message);
    }
  }

  /**
   * Fallback keyword-based intent detection.
   */
  private detectIntentKeyword(message: string): Intent {
    const lower = message.toLowerCase();

    if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/i)) {
      return "greeting";
    }
    if (lower.match(/timeline|career journey|sequential|history/i)) {
      return "timeline";
    }
    if (lower.match(/skills?\s+match|analyze fit|role fit|fit analyze|skill set/i)) {
      return "flashcards";
    }
    if (lower.match(/flash\s*card|study\s*card|review\s*card|f'?card/i)) {
      return "flashcards";
    }
    if (lower.match(/blog|article|medium|publication|whitepaper|insight/i)) {
      return "blog_cards";
    }
    if (lower.match(/video gallery|youtube gallery|video cards|watch|cinema/i)) {
      return "video_cards";
    }
    if (lower.match(/award|honor|hackathon|trophy|recogni|achievement/i)) {
      return "awards";
    }
    if (lower.match(/gallery|portfolio|work samples|pictures of work/i)) {
      return "gallery";
    }
    if (lower.match(/certif|credential|badge/i)) {
      return "certs";
    }
    if (lower.match(/speak|keynote|cloud next/i)) {
      return "speaker";
    }
    if (lower.match(/testimonial|what people say|feedback|quote/i)) {
      return "testimonials";
    }
    if (lower.match(/quiz|test me|assessment/i)) {
      return "quiz";
    }
    if (lower.match(/podcast|audio|listen/i)) {
      return "podcast";
    }
    if (lower.match(/bubble/i)) {
      return "bubble";
    }
    if (lower.match(/image|photo|picture|pic|headshot|avatar/i)) {
      return "image";
    }
    if (lower.match(/matrix|dashboard|framework|comparison|visual breakdown/i)) {
      return "creative";
    }
    if (lower.match(/radar|skill breakdown|skill chart|proficiency/i)) {
      return "charts";
    }
    if (lower.match(/weather|temperature|forecast/i)) {
      return "weather";
    }
    if (lower.match(/stock price|nasdaq|ticker|shares/i)) {
      return "stock";
    }
    if (lower.match(/repository|repo|open source|github/i)) {
      return "repositories";
    }
    return "general";
  }

  /**
   * Generate the main chat response using Gemini.
   */
  private async generateResponse(
    userMessage: string,
    intent: Intent
  ): Promise<{ text: string }> {
    // History excludes the current message, which is sent separately as userMessage.
    // The server owns the system prompt and looks up guidance for this intent itself.
    const messages = this.conversationHistory.slice(0, -1).slice(-10).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          mode: "chat",
          intent,
          messages,
          userMessage,
          model: this.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return { text: data.text || data.response || "I apologize, I couldn't generate a response." };
    } catch (error) {
      console.error("[Orchestrator] Error calling chat API:", error);

      // Fallback responses based on intent
      return this.getFallbackResponse(intent);
    }
  }

  /**
   * Get a fallback response if the API fails.
   */
  private getFallbackResponse(intent: Intent): { text: string } {
    switch (intent) {
      case "flashcards":
        return {
          text: "Here are some personalized flashcards to help you master these concepts!",
        };
      case "podcast":
      case "audio":
        return {
          text: "There's no podcast episode, but here are Enrique's recorded talks and keynotes from the Cinema Hub.",
        };
      case "video_cards":
        return {
          text: "Welcome to the Cinema Hub! Here are some of my top talks and keynotes on Agentic AI.",
        };
      case "blog":
        return {
          text: "Here is the Insight Stream, featuring my latest whitepapers and technical blogs on Medium and Kaggle.",
        };
      case "video":
        return {
          text: "Let me show you this video message where Enrique discusses the future of Agentic AI.",
        };
      case "quiz":
        return {
          text: "Let's test your knowledge! Here's a quick quiz on Enrique's career highlights and major projects.",
        };
      case "timeline":
        return {
          text: "Here's a breakdown of Enrique's professional journey over the last 15 years, including his impact at Google and AWS.",
        };
      case "certs":
        return {
          text: "Here are Enrique's 16 professional certifications: 8 Google Cloud, 6 AWS, plus SAFe and Splunk.",
        };
      case "awards":
        return {
          text: "Here are some of Enrique's major professional recognitions and award-winning projects.",
        };
      case "greeting":
        return {
          text: "Hello! I'm Enrique's AI Agent. How can I help you explore his career today?",
        };
      default:
        return {
          text: "I've pulled up some relevant highlights for you. Feel free to ask more specific questions about Enrique's experience at Google or his work on Agentic AI.",
        };
    }
  }

  /**
   * Update the message element with text content.
   */
  private setMessageText(messageElement: HTMLDivElement, text: string): void {
    const textEl = messageElement.querySelector(".message-text");
    if (textEl) {
      // renderMarkdown escapes all text and only emits allow-listed tags and URLs.
      textEl.innerHTML = renderMarkdown(text);
    }
  }

  /**
   * Add a processing placeholder for async content.
   */
  private addProcessingPlaceholder(
    messageElement: HTMLDivElement,
    intent: Intent
  ): HTMLDivElement {
    const contentEl = messageElement.querySelector(".message-content");
    if (!contentEl) throw new Error("Message content element not found");

    const placeholder = document.createElement("div");
    placeholder.className = "processing-card";

    const spinner = document.createElement("div");
    spinner.className = "spinner";
    const label = document.createElement("span");
    label.className = "text";
    label.textContent = this.getProcessingLabel(intent);
    placeholder.append(spinner, label);

    contentEl.appendChild(placeholder);
    return placeholder;
  }

  /**
   * Get the processing label for an intent.
   */
  private getProcessingLabel(intent: Intent): string {
    switch (intent) {
      case "flashcards":
        return "Generating personalized flashcards... 🎲";
      case "podcast":
      case "audio":
      case "video_cards":
        return "Loading Cinema Hub... 🎬";
      case "video":
        return "Loading video... 🎥";
      case "blog":
        return "Streaming Insights... ✍️";
      case "image":
        return "Retrieving visual... 📸";
      case "quiz":
        return "Creating quiz questions... 🧠";
      case "timeline":
        return "Constructing Career Timeline... 📜";
      case "gallery":
        return "Entering the Hall of Mastery... 🖼️";
      case "awards":
        return "Unlocking the Trophy Room... 🏆";
      case "certs":
        return "Loading the Cloud Badge Wall... ☁️";
      case "speaker":
        return "Preparing Stage Presence... 🎤";
      case "testimonials":
        return "Gathering Googler Vibes... ✨";
      case "weather":
        return "Checking weather conditions... 🌧️";
      case "stock":
        return "Retrieving real-time market data... 📈";
      default:
        return "Processing... ⚡";
    }
  }

  /**
   * Add a one-click Copy Response button to the message header actions.
   */
  private addCopyButton(messageElement: HTMLDivElement, rawText: string): void {
    const actionsEl = messageElement.querySelector(".message-actions");
    if (!actionsEl) return;

    const btn = document.createElement("button");
    btn.className = "copy-msg-btn";
    btn.title = "Copy response text";

    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined";
    icon.style.fontSize = "16px";
    icon.textContent = "content_copy";
    btn.appendChild(icon);

    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(rawText);
        icon.textContent = "check";
        btn.classList.add("copied");
        setTimeout(() => {
          icon.textContent = "content_copy";
          btn.classList.remove("copied");
        }, 2000);
      } catch (err) {
        console.warn("[Orchestrator] Clipboard write failed:", err);
        window.dispatchEvent(
          new CustomEvent("portfolio:toast", {
            detail: { message: "Couldn't copy: your browser blocked clipboard access." },
          })
        );
      }
    });

    actionsEl.appendChild(btn);
  }

  /**
   * Add contextual follow-up suggestion chips at the bottom of an assistant response.
   */
  private addFollowupChips(messageElement: HTMLDivElement, intent: Intent): void {
    const contentEl = messageElement.querySelector(".message-content");
    if (!contentEl) return;

    const followupsByIntent: Record<string, Array<{ icon: string; label: string; prompt: string }>> = {
      timeline: [
        { icon: "psychology", label: "Skill Match vs Senior AI Role", prompt: "How do Enrique's skills match a Senior AI role?" },
        { icon: "emoji_events", label: "2026 Awards & SWIFTY", prompt: "List Enrique's major awards and hackathon wins" },
        { icon: "collections", label: "Hall of Mastery", prompt: "Show me a gallery of your work and highlights" }
      ],
      awards: [
        { icon: "verified", label: "4x Analyst Leader Wins", prompt: "How did Enrique drive 4x Gartner Magic Quadrant and Forrester Wave Leader wins in 2026?" },
        { icon: "history_edu", label: "Career Timeline", prompt: "Show me Enrique's career highlights as a sequential timeline" },
        { icon: "format_quote", label: "Leadership Testimonials", prompt: "Show me what people think of Enrique (testimonials)" }
      ],
      certs: [
        { icon: "radar", label: "Technical Proficiency Radar", prompt: "Show me your technical proficiency radar" },
        { icon: "folder_code", label: "Open Source Repos", prompt: "Show me your featured open source repositories" },
        { icon: "analytics", label: "AI Lead Fit Analysis", prompt: "Analyze Enrique's fit for an AI Lead role" }
      ],
      gallery: [
        { icon: "folder_code", label: "AgentOps Cockpit & Repos", prompt: "Show me your featured open source repositories" },
        { icon: "smart_display", label: "Cinema Hub Keynotes", prompt: "Show me his top YouTube videos" },
        { icon: "article", label: "Medium Publications", prompt: "Show me some of his Medium blog posts" }
      ],
      repositories: [
        { icon: "collections", label: "Hall of Mastery Projects", prompt: "Show me a gallery of your work and highlights" },
        { icon: "article", label: "Read Technical Blogs", prompt: "Show me some of his Medium blog posts" },
        { icon: "workspace_premium", label: "16x Cloud Certifications", prompt: "Show Enrique's cloud certifications" }
      ],
      speaker: [
        { icon: "smart_display", label: "Watch Keynote Videos", prompt: "Show me his top YouTube videos" },
        { icon: "format_quote", label: "Googler Testimonials", prompt: "Show me what people think of Enrique (testimonials)" },
        { icon: "emoji_events", label: "Trophy Room", prompt: "List Enrique's major awards and hackathon wins" }
      ]
    };

    const defaultFollowups = [
      { icon: "history_edu", label: "Career Timeline", prompt: "Show me Enrique's career highlights as a sequential timeline" },
      { icon: "collections", label: "Hall of Mastery", prompt: "Show me a gallery of your work and highlights" },
      { icon: "emoji_events", label: "2026 Awards & SWIFTY", prompt: "List Enrique's major awards and hackathon wins" }
    ];

    const chips = followupsByIntent[intent] || defaultFollowups;

    const container = document.createElement("div");
    container.className = "followup-chips";

    chips.forEach((chipData) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "followup-chip";
      btn.dataset.prompt = chipData.prompt;

      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined";
      icon.textContent = chipData.icon;

      const label = document.createElement("span");
      label.textContent = chipData.label;

      btn.append(icon, label);
      btn.addEventListener("click", () => {
        window.dispatchEvent(
          new CustomEvent("portfolio:send-prompt", {
            detail: { prompt: chipData.prompt }
          })
        );
      });

      container.appendChild(btn);
    });

    contentEl.appendChild(container);
  }

  /**
   * Add a JSON schema viewer to the message.
   */
  private addJsonViewer(messageElement: HTMLDivElement, json: any): void {
    const actionsEl = messageElement.querySelector(".message-actions");
    const contentEl = messageElement.querySelector(".message-content");
    if (!actionsEl || !contentEl) return;

    // Create toggle button
    const btn = document.createElement("button");
    btn.className = "json-toggle-btn";
    btn.title = "Show A2UI JSON Schema";
    const codeIcon = document.createElement("span");
    codeIcon.className = "material-symbols-outlined";
    codeIcon.style.fontSize = "18px";
    codeIcon.textContent = "code";
    btn.appendChild(codeIcon);

    // Create viewer element
    const viewer = document.createElement("pre");
    viewer.className = "json-viewer";
    viewer.style.display = "none"; // Ensure absolute initial state
    viewer.textContent = JSON.stringify(json, null, 2);

    // Add event listener with logging
    btn.addEventListener("click", () => {
      console.log("[Orchestrator] JSON Toggle Clicked");
      const isShowing = viewer.style.display === "none";
      viewer.style.display = isShowing ? "block" : "none";
      btn.classList.toggle("active", isShowing);

      // Scroll into view if opening
      if (isShowing) {
        setTimeout(() => {
          viewer.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      }
    });

    actionsEl.appendChild(btn);
    contentEl.appendChild(viewer);
  }
}
