/*
 * Chat Orchestrator
 *
 * Orchestrates the chat flow between the user, Gemini, and the A2A agent.
 * Determines when to generate A2UI content and manages async artifact generation.
 */

import { A2UIRenderer } from "./a2ui-renderer";
import { A2AClient } from "./a2a-client";
import { getIdToken } from "./firebase-auth";

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
  | "image"
  | "quiz"
  | "awards"
  | "certs"
  | "speaker"
  | "testimonials"
  | "timeline"
  | "general"
  | "greeting";

export class ChatOrchestrator {
  private conversationHistory: Message[] = [];
  private renderer: A2UIRenderer;
  private a2aClient: A2AClient;

  // System prompt for conversational responses.
  // Note: Maria's profile also appears in agent/agent.py (for content generation) and
  // learner_context/ files (for dynamic personalization). This duplication is intentional—
  // the frontend and agent operate independently and both need learner context.
  private systemPrompt = `You are Enrique K Chan's Portfolio Agent, a premium AI assistant for recruiters and hiring managers.
Your goal is to provide deep, high-signal insights into Enrique's 15+ years of experience across Google, AWS, and Accenture.

## CONVERSATIONAL PHILOSOPHY
1. **Be Direct and Authoritative**: Provide specific facts about Enrique's career. When asked for information (awards, certs, blogs, etc.), acknowledge the request briefly and let the dedicated UI component show the details.
2. **Handle Requests Directly**: Provide relevant links (LinkedIn, Medium, GitHub) directly in your conversational response.
3. **Show, Don't Just Tell**: Refer to Enrique's visual achievements directly. The interactive views will be rendered automatically; your job is to provide the narrative context.

## DETAILED EXPERIENCE HISTORY
- **Google Cloud (Nov 2025 - Present)**: Outbound Product Manager, Cloud AI. Leading AI Agents COE.
  - Impact: Scaled Agentic AI enablement to 1.5M+ developers.
- **Google Cloud (Jun 2023 - Nov 2025)**: Sr AI Consultant, PSO.
  - Impact: Lead on NBC Olympics 'Oli' Chatbot (90M+ queries, 40M viewers). $1.3M Vertex AI revenue.
- **AWS (May 2020 - May 2021)**: Senior Cloud Architect.
  - Impact: Modernized legacy infrastructures for Fortune 500s.
- **Accenture (Nov 2010 - May 2020)**: Senior Manager, Cloud Strategy (10-Year Tenure).
  - Highlights: Sold $10M+ in delivery work; generated $25M in pre-sales pipeline. Managed 5 direct reports.
  - Projects: Led high-scale cloud modernization and global data analytics migrations for major enterprises.

## KEY PROFESSIONAL DATA
- **Role**: Outbound Product Manager, Cloud AI at Google.
- **Experience**: 15+ years total.
- **Major Achievement**: NBC Olympics 'Oli' Chatbot (GenAI).
- **Architecture**: Leading transition from RAG to Agentic Workflows.
- **Certifications**: 19x combined (10x Google, 7x AWS, 2x Azure).
- **Awards**: Cloud Tech Impact Award 2024 (Trophy), GTM Excellence, AIS Hackathon Winner.
- **Links**:
  - LinkedIn: https://www.linkedin.com/in/enriquechan/
  - Medium: https://medium.com/@enriq
  - GitHub: https://github.com/enriquekalven
  - YouTube: https://www.youtube.com/@enriquekchan

## VISUAL ASSETS (FOR CONTEXT)
- Profile Pic: ![Enrique K Chan](/assets/hero.png)
- Olympics Architecture: ![Olympic AI Architecture](/assets/architecture.jpg)
- Trophy: ![Cloud Tech Impact Award](/assets/award_gtm_2024.jpg)

## RESPONSE STYLE
- Tone: Premium, professional, high-signal.
- Persona: A visionary executive assistant who knows Enrique's technical and business impact perfectly.
- **IMPORTANT**: DO NOT use filler phrases like "That's a great question" or "Let me help you think". Be a direct executive assistant. Provide facts immediately.

## CONTENT RULES
- If asked about awards: Mention the GTM awards and the Trophy. The cards will render below.
- If asked about certs: Mention the 19x cloud certifications. The grid will render below.
- If asked about speaking: Mention Google Cloud Next and the ADK Summit. The flashcards will render below.
- If asked about testimonials: Mention feedback from Thomas Kurian and other leaders. The flashcards will render below.`;

  constructor(renderer: A2UIRenderer) {
    this.renderer = renderer;
    this.a2aClient = new A2AClient();
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
      console.warn("[Orchestrator] Combined endpoint failed, falling back to separate calls");
      // Fallback to separate calls if combined endpoint fails
      intent = await this.detectIntentWithLLM(userMessage);
      console.log(`[Orchestrator] Fallback detected intent: ${intent}`);
      const response = await this.generateResponse(userMessage, intent);
      responseText = response.text;
    }

    // Update the message element with the response text
    this.setMessageText(messageElement, responseText);

    // If we need A2UI content, fetch and render it
    if (intent !== "general" && intent !== "greeting") {
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
        placeholder.innerHTML = `
          <span class="material-symbols-outlined" style="color: #f87171;">error</span>
          <span class="text">Failed to load content. Please try again.</span>
        `;
      }
    }

    // Add assistant response to history
    this.conversationHistory.push({ role: "assistant", content: responseText });
  }

  /**
   * Get combined intent and response in a single LLM call.
   * This reduces latency by eliminating one round-trip.
   * For content-generating intents, also returns keywords for better content retrieval.
   */
  private async getCombinedIntentAndResponse(message: string): Promise<{ intent: string; text: string; keywords?: string }> {
    const recentContext = this.conversationHistory.slice(-4).map(m =>
      `${m.role}: ${m.content}`
    ).join("\n");

    const response = await fetch("/api/chat-with-intent", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        systemPrompt: this.systemPrompt,
        messages: this.conversationHistory.slice(-10).map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
        userMessage: message,
        recentContext: recentContext,
      }),
    });

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
    const recentContext = this.conversationHistory.slice(-4).map(m =>
      `${m.role}: ${m.content}`
    ).join("\n");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          systemPrompt: `You are an intent classifier. Analyze the user's message and conversation context to determine their intent.

IMPORTANT: Consider the CONVERSATION CONTEXT. If the user previously discussed flashcards/podcasts/videos and says things like "yes", "sure", "do it", "render them", "show me", "ya that works" - they are CONFIRMING a previous offer.

Return ONLY ONE of these exact words (nothing else):
- flashcards - if user wants study cards, review cards, flashcards, or is confirming a flashcard offer
- image - if user asks for a picture, photo, headshot, or visual representation
- video - if user wants to watch something or see a video
- podcast - if user wants audio content, podcast, or to listen to something
- quiz - if user wants to be tested or take a quiz
- awards - if user asks for awards, honors, hackathons, or recognitions
- certs - if user asks for certifications or credentials
- speaker - if user asks for speaking engagements or keynotes
- testimonials - if user asks for what people say or feedback
- timeline - if user asks for career history, journey, timeline, or sequential experience
- greeting - if user is just saying hello/hi
- general - for questions, explanations, or general conversation

Examples:
- "make me some flashcards" → flashcards
- "what awards have you won?" → awards
- "show me your certifications" → certs
- "explain ATP" → general
- "hi there" → greeting`,
          intentGuidance: "",
          messages: [],
          userMessage: `Recent conversation:\n${recentContext}\n\nCurrent message: "${message}"\n\nIntent:`,
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
      if (intentText.includes("podcast") || intentText.includes("audio")) return "podcast";
      if (intentText.includes("video")) return "video";
      if (intentText.includes("quiz")) return "quiz";
      if (intentText.includes("award")) return "awards";
      if (intentText.includes("cert")) return "certs";
      if (intentText.includes("speaker") || intentText.includes("speaking")) return "speaker";
      if (intentText.includes("testimonial") || intentText.includes("people say")) return "testimonials";
      if (intentText.includes("timeline") || intentText.includes("journey")) return "timeline";
      if (intentText.includes("greeting")) return "greeting";

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
    if (lower.match(/flash\s*card|study\s*card|review\s*card|f'?card/i)) {
      return "flashcards";
    }
    if (lower.match(/podcast|audio|listen/i)) {
      return "podcast";
    }
    if (lower.match(/video|watch/i)) {
      return "video";
    }
    if (lower.match(/image|photo|picture|pic|headshot/i)) {
      return "image";
    }
    if (lower.match(/quiz|test me/i)) {
      return "quiz";
    }
    if (lower.match(/award|honor|hackathon|recogni/i)) {
      return "awards";
    }
    if (lower.match(/certif|credential/i)) {
      return "certs";
    }
    if (lower.match(/speak|keynote/i)) {
      return "speaker";
    }
    if (lower.match(/testimonial|what people say/i)) {
      return "testimonials";
    }
    if (lower.match(/timeline|career history|journey/i)) {
      return "timeline";
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
    // Build the conversation context
    const messages = this.conversationHistory.slice(-10).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    // Add intent-specific guidance
    let intentGuidance = "";
    switch (intent) {
      case "flashcards":
        intentGuidance =
          "The user wants flashcards. Respond with a SHORT (1-2 sentences) conversational acknowledgment. DO NOT include the flashcard content in your response - the flashcards will be rendered separately as interactive cards below your message. Just say something brief like 'Here are some flashcards to help you review!' or 'I've created some personalized flashcards for you.'";
        break;
      case "podcast":
      case "audio":
        intentGuidance =
          "The user wants to listen to the podcast. Respond with a SHORT (1-2 sentences) introduction. DO NOT write out the podcast transcript or script - the audio player will be rendered separately below your message. Just say something brief like 'Here's a personalized podcast about ATP!' or 'I've got a podcast that explains this with gym analogies you'll love.'";
        break;
      case "video":
        intentGuidance =
          "The user wants to watch a video. Respond with a SHORT (1-2 sentences) introduction. DO NOT describe the video content in detail - the video player will be rendered separately below your message. Just say something brief like 'Here's a video that visualizes this concept!' or 'Check out this visual explanation.'";
        break;
      case "image":
        intentGuidance =
          "The user wants to see a picture. Respond with a SHORT (1-2 sentences) acknowledgment. The image will be rendered separately as an A2UI component below. Just say something like 'Sure, here's a look at that!' or 'I've pulled up the visual for you.'";
        break;
      case "quiz":
        intentGuidance =
          "The user wants a quiz. Respond with a SHORT (1-2 sentences) introduction. DO NOT include the quiz questions or answers in your response - the interactive quiz cards will be rendered separately below your message. Just say something brief like 'Let's test your knowledge!' or 'Here's a quick quiz to check your understanding.'";
        break;
      case "awards":
        intentGuidance =
          "The user wants to see rewards and honors. Provide a SHORT (1 sentence) professional acknowledgment. The award cards (with the trophy image) will be rendered separately below. Just say 'Here are some of my major recognitions and awards.'";
        break;
      case "certs":
        intentGuidance =
          "The user wants to see cloud certifications. Provide a SHORT (1 sentence) acknowledgment. The certification grid will be rendered below. Just say 'Here is my list of professional cloud certifications.'";
        break;
      case "speaker":
        intentGuidance =
          "The user wants to see speaking history. Provide a SHORT (1 sentence) acknowledgment. The speaker flashcards will be rendered below. Just say 'Here are some of my key public speaking and keynote sessions.'";
        break;
      case "testimonials":
        intentGuidance =
          "The user wants to see what Googlers say. Provide a SHORT (1 sentence) acknowledgment. The testimonials flashcards will be rendered below. Just say 'Here is some of the feedback I have received from leadership and colleagues at Google.'";
        break;
      case "timeline":
        intentGuidance =
          "The user wants to see your career journey. Provide a SHORT (1 sentence) acknowledgment. The sequential timeline with ExperienceCards will be rendered below. Just say 'Here is a walk through my professional journey over the last 15 years.'";
        break;
      case "greeting":
        intentGuidance =
          "The user is greeting you. Respond warmly in 1-2 sentences and briefly mention you can help them explore Enrique's career highlights, top projects, and skills through flashcards or quizzes.";
        break;
      default:
        intentGuidance =
          "Respond helpfully but concisely (2-3 sentences max). Provide clear answers about Enrique's work at Google, AWS, or Accenture, and offer to show more details via flashcards or the career timeline.";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          systemPrompt: this.systemPrompt,
          intentGuidance,
          messages,
          userMessage,
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
          text: "Here's a quick audio overview of Enrique's professional journey and key technical philosophies.",
        };
      case "video":
        return {
          text: "Let me show you this video message where Enrique discusses the future of Agentic AI and high-fidelity user interfaces.",
        };
      case "quiz":
        return {
          text: "Let's test your knowledge! Here's a quick quiz on Enrique's career highlights and major projects.",
        };
      case "greeting":
        return {
          text: "Hello! I'm Enrique's AI Agent. How can I help you explore his career and projects today?",
        };
      default:
        return {
          text: "That's a great question! Let me help you think through this.",
        };
    }
  }

  /**
   * Update the message element with text content.
   */
  private setMessageText(messageElement: HTMLDivElement, text: string): void {
    const textEl = messageElement.querySelector(".message-text");
    if (textEl) {
      textEl.innerHTML = this.parseMarkdown(text);
    }
  }

  /**
   * Simple markdown parser for chat messages.
   */
  private parseMarkdown(text: string): string {
    // Escape HTML first for security
    let html = this.escapeHtml(text);

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em>$1</em>');

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Images: ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 12px; margin: 12px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">');

    // YouTube: [video](youtube_url)
    const youtubeVideoRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
    html = html.replace(/\[video\]\((.*?)\)/g, (_, url) => {
      const id = url.match(youtubeVideoRegex)?.[1];
      if (id) {
        return `<div class="video-container" style="margin: 16px 0;"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px;"></iframe></div>`;
      }
      // If not a video ID but still a URL, treat as regular anchor
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // YouTube Autolink (Raw links -> Embeds)
    html = html.replace(/(?<!src=")(?<!href=")(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11})/g, (match) => {
      const id = match.match(youtubeVideoRegex)?.[1];
      if (id) {
        return `<div class="video-container" style="margin: 16px 0;"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 12px;"></iframe></div>`;
      }
      return match;
    });

    // General Autolink: http(s) links not already in href/src
    // Exclude trailing punctuation from the clickable URL
    html = html.replace(/(?<!href="|src=")(https?:\/\/[^\s<]+)/g, (match) => {
      const punctuationMatch = match.match(/[.,;:]+$/);
      if (punctuationMatch) {
        const punctuation = punctuationMatch[0];
        const url = match.substring(0, match.length - punctuation.length);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${punctuation}`;
      }
      return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    });

    // Convert bullet lists: lines starting with - or *
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert numbered lists: lines starting with 1. 2. etc
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Convert double newlines to paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p>');

    // Convert single newlines to <br> (but not inside lists)
    html = html.replace(/(?<!<\/li>)\n(?!<)/g, '<br>');

    // Wrap in paragraph if not empty
    if (html.trim()) {
      html = `<p>${html}</p>`;
    }

    // Clean up empty paragraphs and fix list wrapping
    html = html.replace(/<p>\s*<ul>/g, '<ul>');
    html = html.replace(/<\/ul>\s*<\/p>/g, '</ul>');
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
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

    const label = this.getProcessingLabel(intent);
    placeholder.innerHTML = `
      <div class="spinner"></div>
      <span class="text">${label}</span>
    `;

    contentEl.appendChild(placeholder);
    return placeholder;
  }

  /**
   * Get the processing label for an intent.
   */
  private getProcessingLabel(intent: Intent): string {
    switch (intent) {
      case "flashcards":
        return "Generating personalized flashcards...";
      case "podcast":
      case "audio":
        return "Loading podcast...";
      case "video":
        return "Loading video...";
      case "image":
        return "Retrieving image...";
      case "quiz":
        return "Creating quiz questions...";
      case "timeline":
        return "Building your career timeline...";
      default:
        return "Processing...";
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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
    btn.innerHTML = '<span class="material-symbols-outlined">code</span>';
    
    // Create viewer element
    const viewer = document.createElement("pre");
    viewer.className = "json-viewer";
    viewer.textContent = JSON.stringify(json, null, 2);
    
    // Add event listener
    btn.addEventListener("click", () => {
      const isShowing = viewer.classList.toggle("show");
      btn.classList.toggle("active", isShowing);
    });

    actionsEl.appendChild(btn);
    contentEl.appendChild(viewer);
  }
}
