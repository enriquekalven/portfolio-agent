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
  | "video_cards"
  | "blog"
  | "image"
  | "quiz"
  | "awards"
  | "certs"
  | "speaker"
  | "testimonials"
  | "timeline"
  | "gallery"
  | "blog_cards"
  | "video_cards"
  | "creative"
  | "general"
  | "greeting";

import portfolioData from "./portfolio-data.json";

export class ChatOrchestrator {
  private conversationHistory: Message[] = [];
  private renderer: A2UIRenderer;
  private a2aClient: A2AClient;
  private systemPrompt: string;

  constructor(renderer: A2UIRenderer) {
    this.renderer = renderer;
    this.a2aClient = new A2AClient();
    this.systemPrompt = this.generateSystemPrompt();
  }

  private generateSystemPrompt(): string {
    const { PROFILE, EXPERIENCE, PROJECTS, CERTIFICATIONS, AWARDS } = portfolioData;

    return `You are ${PROFILE.name}'s Portfolio Agent, a premium AI assistant for recruiters and hiring managers.
Your goal is to provide deep, high-signal insights into ${PROFILE.name}'s experience across Google, AWS, and Accenture.

## CONVERSATIONAL PHILOSOPHY
1. **Be Direct and Authoritative**: Provide specific facts about ${PROFILE.name}'s career. When asked for information (awards, certs, blogs, etc.), acknowledge the request briefly and let the dedicated UI component show the details.
2. **Handle Requests Directly**: Provide relevant links (LinkedIn, Medium, GitHub) directly in your conversational response.
3. **Show, Don't Just Tell**: Refer to ${PROFILE.name}'s visual achievements directly. The interactive views will be rendered automatically; your job is to provide the narrative context.

## DETAILED EXPERIENCE HISTORY
${EXPERIENCE.map((e: any) => `- **${e.company} (${e.period})**: ${e.role}.\n  - Impact: ${e.impact}`).join("\n")}

## KEY PROFESSIONAL DATA
- **Role**: ${PROFILE.role}.
- **Experience**: 15+ years total.
- **Top Projects**: ${PROJECTS.map((p: any) => p.title).join(", ")}.
- **Certifications**: ${CERTIFICATIONS.length}x combined across Google, AWS, and Azure.
- **Major Awards**: ${AWARDS.join(", ")}.
- **Links**:
  - LinkedIn: ${PROFILE.links.linkedin}
  - Medium: ${PROFILE.links.medium}
  - GitHub: ${PROFILE.links.github}
  - YouTube: ${PROFILE.links.youtube}

## VISUAL ASSETS (FOR CONTEXT)
- Profile Pic: ![${PROFILE.name}](${PROFILE.profile_pic})
- Olympics Architecture: ![Olympic AI Architecture](/assets/architecture.jpg)
- Trophy: ![Cloud Tech Impact Award](/assets/award_gtm_2024.jpg)

## RESPONSE STYLE
- Tone: Premium, professional, high-signal.
- Persona: A visionary executive assistant who knows ${PROFILE.name}'s technical and business impact perfectly.
- **IMPORTANT**: DO NOT use filler phrases like "That's a great question". Be a direct executive assistant. Provide facts immediately.

## CONTENT RULES
- If asked about awards: Mention the GTM awards and the **Trophy Room 🏆**. The cards will render below.
- If asked about certs: Mention the ${CERTIFICATIONS.length}x cloud certifications and the **Cloud Badge Wall ☁️**. The grid will render below.
- If asked about speaking: Mention Google Cloud Next and his **Stage Presence 🎤**. The cards will render below.
- If asked about testimonials: Mention feedback from Thomas Kurian and the **Googler Vibes ✨**. The cards will render below.
- If asked for a "gallery" or "pictures of work": Mention the **Hall of Mastery 🖼️** and highlights like the Olympics architecture. The gallery will render below.`;
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
- awards - if user asks for awards, honors, hackathons, achievements, highlights, recognitions, or trophies
- certs - if user asks for certifications or credentials
- speaker - if user asks for speaking engagements or keynotes
- testimonials - if user asks for what people say or feedback
- timeline - if user asks for career history, journey, timeline, or sequential experience
- gallery - if user asks for a picture gallery, work samples, or visual portfolio
- creative - if user asks for a 'matrix', 'comparison', 'dashboard', 'framework', or 'visual breakdown'
- greeting - if user is just saying hello/hi
- general - for questions, explanations, or general conversation

Examples:
- "make me some flashcards" → flashcards
- "what awards have you won?" → awards
- "show me your trophies" → awards
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
    if (lower.match(/skill match|analyze fit|role fit|fit analyze|skill set/i)) {
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
    if (lower.match(/image|photo|picture|pic|headshot|avatar|bubble/i)) {
      return "image";
    }
    if (lower.match(/matrix|dashboard|framework|comparison|visual breakdown/i)) {
      return "creative";
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
      case "video_cards":
        intentGuidance =
          "The user wants to see your videos. Respond with a SHORT (1-2 sentences) introduction. Mention the 'Cinema Hub'. Just say something like 'Welcome to the Cinema Hub! Here are some of my top talks and keynotes.'";
        break;
      case "blog":
        intentGuidance =
          "The user wants to read your articles. Respond with a SHORT (1-2 sentences) introduction. Mention the 'Insight Stream'. Just say something like 'Here is the Insight Stream, featuring my latest whitepapers and technical blogs.'";
        break;
      case "video":
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
      case "gallery":
        intentGuidance =
          "The user wants to see a gallery of your work. Provide a SHORT (1 sentence) acknowledgment. A grid of portfolio samples will be rendered below. Just say 'Here is a gallery highlighting some of my key project work.'";
        break;
      case "blog_cards":
        intentGuidance =
          "The user wants to see your blog posts or articles. Provide a SHORT (1 sentence) acknowledgment. A grid of blog cards will be rendered below. Just say 'Here are some of my featured Medium articles and blog posts.'";
        break;
      case "video_cards":
        intentGuidance =
          "The user wants to see your videos or video gallery. Provide a SHORT (1 sentence) acknowledgment. A grid of video cards will be rendered below. Just say 'I have pulled up my video gallery, including keynotes and technical deep dives.'";
        break;
      case "creative":
        intentGuidance =
          "The user wants a creative visual breakdown or framework. Provide a SHORT (1 sentence) acknowledgment. The custom high-fidelity dashboard/matrix will be rendered below. Just say something like 'Let me synthesize a unique visual framework for you.'";
        break;
      case "greeting":
        intentGuidance =
          "The user is greeting you. Respond warmly in 1-2 sentences and briefly mention you can help them explore Enrique's career highlights, top projects, and skills through flashcards or AI-powered quizzes.";
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
          text: "Here is a list of Enrique's 19x professional cloud certifications across Google, AWS, and Azure.",
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
        return "Generating personalized flashcards... 🎲";
      case "podcast":
      case "audio":
        return "Loading podcast... 📻";
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
      default:
        return "Processing... ⚡";
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
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 18px;">code</span>';

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
          viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });

    actionsEl.appendChild(btn);
    contentEl.appendChild(viewer);
  }
}
