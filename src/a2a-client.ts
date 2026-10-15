/*
 * A2A Client
 *
 * Client for communicating with the A2A agent that generates A2UI content.
 * This client talks to the remote agent (locally or on Agent Engine).
 */

import { getIdToken } from "./firebase-auth";
import portfolioData from "./portfolio-data.json";

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

export interface SourceInfo {
  url: string;
  title: string;
  provider: string;
}

export interface A2UIResponse {
  format: string;
  a2ui: unknown[];
  surfaceId: string;
  source?: SourceInfo;
  error?: string;
}

export class A2AClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/a2ui-agent") {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate A2UI content from the agent.
   */
  async generateContent(
    format: string,
    context: string = ""
  ): Promise<A2UIResponse> {
    console.log(`[A2AClient] Requesting ${format} content`);

    const lowerFormat = format.toLowerCase();
    // No podcast episode is published yet (/assets/podcast.m4a doesn't exist), so audio requests
    // show the recorded talks instead of an audio player that can't load.
    const backendFormat = lowerFormat === "blog" ? "blog_cards" : (lowerFormat === "video" || lowerFormat === "video_cards" || lowerFormat === "podcast" || lowerFormat === "audio") ? "video_cards" : (lowerFormat === "matrix" || lowerFormat === "framework") ? "matrix" : (lowerFormat === "charts" || lowerFormat === "radar") ? "charts" : lowerFormat;

    // Local media assets and real-time client utilities render directly
    if (
      backendFormat === "podcast" ||
      backendFormat === "audio" ||
      backendFormat === "video" ||
      backendFormat === "bubble" ||
      backendFormat === "weather" ||
      backendFormat === "stock" ||
      backendFormat === "time"
    ) {
      console.log(`[A2AClient] Using local media/utility handler for: ${format}`);
      return this.getFallbackContent(backendFormat, context);
    }

    console.log(`[A2AClient] Routing query to Agent Engine for format: ${format}`);

    try {
      const response = await fetch(`${this.baseUrl}/a2a/query`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          message: context ? `${backendFormat}:${context}` : backendFormat,
          session_id: this.getSessionId(),
          extensions: ["https://a2ui.org/a2a-extension/a2ui/v0.8"],
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[A2AClient] Received response:`, data);

      const a2uiStr = JSON.stringify(data.a2ui || []);
      const hasValidA2UIStructure =
        Array.isArray(data.a2ui) &&
        data.a2ui.length > 0 &&
        data.a2ui.some((m: any) => m && (m.beginRendering || m.surfaceUpdate));
      const hasStaleLegacyData =
        a2uiStr.includes("Why-Agents-Fail") ||
        a2uiStr.includes("ATP and bond energy");

      // Check if the response has valid A2UI content and is in sync with 2026 portfolio
      if (
        !hasValidA2UIStructure ||
        hasStaleLegacyData ||
        data.error ||
        data.rawText?.includes("cannot fulfill") ||
        data.rawText?.includes("do not have the functionality")
      ) {
        console.log(`[A2AClient] Agent returned non-A2UI or stale payload, using synchronized 2026 portfolio data for ${backendFormat}`);
        return this.getFallbackContent(backendFormat, context);
      }

      // Special case: if we requested a quiz but agent returned flashcards,
      // use our quiz fallback instead (agent doesn't know about QuizCard)
      if (backendFormat === "quiz") {
        if (a2uiStr.includes("Flashcard") && !a2uiStr.includes("QuizCard")) {
          console.log(`[A2AClient] Agent returned Flashcards for quiz request, using QuizCard fallback`);
          return this.getFallbackContent(backendFormat, context);
        }
      }

      return data as A2UIResponse;
    } catch (error) {
      console.error("[A2AClient] Error calling agent:", error);

      // Return synchronized 2026 portfolio content
      return this.getFallbackContent(backendFormat, context);
    }
  }

  /**
   * Stream A2UI content from the agent (for long-running generation).
   */
  async *streamContent(
    format: string,
    context: string = ""
  ): AsyncGenerator<{ status: string; data?: A2UIResponse }> {
    console.log(`[A2AClient] Streaming ${format} content`);

    try {
      const response = await fetch(`${this.baseUrl}/a2a/stream`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          message: context ? `${format}:${context}` : format,
          session_id: this.getSessionId(),
          extensions: ["https://a2ui.org/a2a-extension/a2ui/v0.8"],
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.is_task_complete) {
              yield { status: "complete", data: data.content };
            } else {
              yield { status: "processing" };
            }
          }
        }
      }
    } catch (error) {
      console.error("[A2AClient] Stream error:", error);
      const lowerFormat = format.toLowerCase();
      const backendFormat = lowerFormat === "blog" ? "blog_cards" : lowerFormat;
      yield { status: "complete", data: this.getFallbackContent(backendFormat, context) };
    }
  }

  /**
   * Get or create a session ID.
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem("a2ui_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("a2ui_session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Get fallback content for demo purposes when agent is unavailable.
   */
  /**
   * Get fallback content for demo purposes when agent is unavailable.
   */
  private getFallbackContent(format: string, context: string = ""): A2UIResponse {
    const surfaceId = "learningContent";
    const { PROFILE, EXPERIENCE, PROJECTS, REPOSITORIES, CERTIFICATIONS, AWARDS, TESTIMONIALS, BLOGS, VIDEOS, SPEAKING, GALLERY } = portfolioData as any;

    switch (format.toLowerCase()) {
      case "flashcards":
        const skillPool = [
          {
            front: "What is his current dual role at Google Cloud (2026)?",
            back: "Staff AI Technical Deployment Lead @ Google Cloud Delta & Outbound Product Manager, Cloud AI — driving $2B+ in enterprise AI transformations.",
            category: "Skill Matcher"
          },
          {
            front: "What analyst recognition has Enrique helped Google Cloud win in 2026?",
            back: "4 consecutive 2026 Leader recognitions across Gartner Magic Quadrants (Enterprise AI Assistants, CNAP, AIADP) and Forrester Wave (AI Platforms Q3 2026).",
            category: "Analyst Leadership"
          },
          {
            front: "What are his core Agentic AI & Production competencies?",
            back: "Vertex AI Agent Engine, Google ADK, A2A, MCP, A2UI, AgentOps Cockpit v2.0.2, and Gemini 2.5/3.6 enterprise deployment.",
            category: "Technical Skills"
          },
          {
            front: "What global developer scale has he achieved?",
            back: "Architected Advent of Agents reaching 32,000+ developers with 5T+ tokens processed, and Kaggle Intro to Agents Whitepaper (1.5M+ readers).",
            category: "Developer Ecosystem"
          }
        ];

        const fitPool = [
          {
            front: `How does ${PROFILE.name.split(' ')[0]}'s background fit an AI Lead role?`,
            back: `15+ years scaling distributed systems & Agentic AI. Staff TDL @ Google Cloud Delta, Q3 2026 Silver Google AI Award (SWIFTY) winner, and Lead on NBC Olympics 'Oli' (40M+ viewers).`,
            category: "Fit Analyzer"
          },
          {
            front: "What is his architectural philosophy for AI?",
            back: "Architecture-first, Day-2 production readiness: AgentOps Cockpit v2.0.2, FinOps governance, Red-Team security, and verifiable evaluation gates.",
            category: "Visionary Fit"
          },
          {
            front: "Why is Enrique a good fit for high-scale AI systems?",
            back: "Proven track record scaling NBC Olympics (40M+ viewers), Disney+ (50M+ users), and Disney MagicBands (290K+ guests).",
            category: "Enterprise Fit"
          },
          {
            front: "What did he achieve with the SWIFTY AI Initiative (2026)?",
            back: "Earned the Q3 2026 Silver Google AI Award for leading a 16-expert Tiger Team automating global contract renewal workflows.",
            category: "Project Impact"
          },
          {
            front: "What do Google Cloud leaders say about him?",
            back: "Thomas Kurian praised his customer empathy and engineering excellence; Michael Clark awarded him for technical impact.",
            category: "Leadership Sentiment"
          }
        ];

        // Determine which pool to favor based on context
        const isSkillQuery = context.toLowerCase().includes("skill") || context.toLowerCase().includes("matcher");
        const isFitQuery = context.toLowerCase().includes("fit") || context.toLowerCase().includes("analyzer") || context.toLowerCase().includes("analyze");

        let flashcardPool;
        if (isSkillQuery) {
          flashcardPool = skillPool;
        } else if (isFitQuery) {
          flashcardPool = fitPool;
        } else {
          flashcardPool = [...skillPool, ...fitPool];
        }

        // Robust Fisher-Yates shuffle
        const shuffle = (array: any[]) => {
          for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
          }
          return array;
        };

        const shuffled = shuffle([...flashcardPool]).slice(0, 3);

        return {
          format: "flashcards",
          surfaceId,
          source: { provider: "Portfolio", url: PROFILE.links.portfolio, title: "Career Highlights" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["headerText", "flashcardRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "headerText",
                    component: {
                      Text: {
                        text: { literalString: `Career Highlights & Insights: ${PROFILE.name}` },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "flashcardRow",
                    component: {
                      Row: {
                        children: { explicitList: ["card1", "card2", "card3"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...shuffled.map((card, i) => ({
                    id: `card${i + 1}`,
                    component: {
                      Flashcard: {
                        front: card.front,
                        back: card.back,
                        category: card.category,
                      },
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "timeline":
        return {
          format: "timeline",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", ...EXPERIENCE.map((_: any, i: number) => `exp${i}`)] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Professional Career Timeline" },
                        usageHint: "h2",
                      },
                    },
                  },
                  ...EXPERIENCE.map((exp: any, i: number) => ({
                    id: `exp${i}`,
                    component: {
                      ExperienceCard: {
                        company: exp.company,
                        role: exp.role,
                        period: exp.period,
                        logo: exp.logo || "business",
                        color: exp.color || "#4285F4",
                        highlights: exp.highlights,
                        impact: exp.impact || exp.description,
                      },
                    },
                  })),
                ],
              },
            },
          ],
        };
      case "awards":
        return {
          format: "awards",
          surfaceId,
          source: { provider: "LinkedIn", url: PROFILE.links.linkedin, title: "Trophy Room" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "awardRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Key Industry Awards & Honors 🏆" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "awardRow",
                    component: {
                      Row: {
                        children: { explicitList: AWARDS.slice(0, 3).map((_: any, i: number) => `a${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...AWARDS.slice(0, 3).map((award: any, i: number) => ({
                    id: `a${i}`,
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: award.title,
                        description: award.description,
                        image: award.image,
                        url: award.url
                      }
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "certs":
        return {
          format: "certs",
          surfaceId,
          source: { provider: "Credly", url: "https://www.credential.net/profile/enriquekchan", title: "Cloud Badge Wall" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "certRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Professional Cloud Certifications ☁️" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "certRow",
                    component: {
                      Row: {
                        children: { explicitList: CERTIFICATIONS.slice(0, 3).map((_: any, i: number) => `c${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...CERTIFICATIONS.slice(0, 3).map((cert: any, i: number) => ({
                    id: `c${i}`,
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: cert.title,
                        description: cert.description || `Issued by ${cert.issuer} (${cert.date})`,
                        image: cert.image,
                        url: cert.url
                      }
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "speaker":
        return {
          format: "speaker",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "speakerRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Global Speaking Engagements" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "speakerRow",
                    component: {
                      Row: {
                        children: { explicitList: SPEAKING.slice(0, 2).map((_: any, i: number) => `s${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...SPEAKING.slice(0, 2).map((s: any, i: number) => ({
                    id: `s${i}`,
                    component: {
                      Flashcard: {
                        front: s.title,
                        back: s.description || `${s.session || s.title} — ${s.event} (${s.time}, ${s.location})`,
                        category: "Public Speaking"
                      }
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "testimonials":
        return {
          format: "testimonials",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "testimonialRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Googler Feedback & Testimonials" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "testimonialRow",
                    component: {
                      Row: {
                        children: { explicitList: TESTIMONIALS.map((_: any, i: number) => `t${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...TESTIMONIALS.map((t: any, i: number) => ({
                    id: `t${i}`,
                    component: {
                      Flashcard: {
                        front: t.author,
                        back: t.quote,
                        category: "Googler Feedback",
                      },
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "video_cards":
        return {
          format: "video_cards",
          surfaceId,
          source: { provider: "YouTube", url: PROFILE.links.youtube, title: "@enriquekchan" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "videoRow1", "videoRow2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Cinema Hub 🎬" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "videoRow1",
                    component: {
                      Row: {
                        children: { explicitList: ["v0", "v1"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "videoRow2",
                    component: {
                      Row: {
                        children: { explicitList: ["v2", "v3"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...VIDEOS.slice(0, 4).map((v: any, i: number) => ({
                    id: `v${i}`,
                    component: {
                      PortfolioCard: {
                        type: "video",
                        title: v.title,
                        description: v.description,
                        image: v.thumbnail,
                        url: v.url
                      }
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "blog_cards":
        console.log("[A2AClient] Generating blog_cards fallback");
        const blogItems = [
          {
            title: "Intro to Agents Whitepaper",
            description: "The definitive Kaggle guide with 1.5M+ attendees reached.",
            image: "/assets/blog-a2ui.png",
            url: "https://www.kaggle.com/whitepaper-introduction-to-agents"
          },
          ...(BLOGS || []).slice(0, 5)
        ];

        return {
          format: "blog_cards",
          surfaceId,
          source: { provider: "Medium", url: PROFILE.links.medium, title: "Insight Stream" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "blogRow1", "blogRow2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Insight Stream ✍️" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "blogRow1",
                    component: {
                      Row: {
                        children: { explicitList: ["b0", "b1", "b2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "blogRow2",
                    component: {
                      Row: {
                        children: { explicitList: ["b3", "b4", "b5"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...blogItems.slice(0, 6).map((b: any, i: number) => ({
                    id: `b${i}`,
                    component: {
                      PortfolioCard: {
                        type: "blog",
                        title: b.title,
                        description: b.description,
                        image: b.image,
                        url: b.url
                      }
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "gallery":
        return {
          format: "gallery",
          surfaceId,
          source: { provider: "Portfolio", url: PROFILE.links.portfolio, title: "Hall of Mastery" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "galleryRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Hall of Mastery 🖼️" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "galleryRow",
                    component: {
                      Row: {
                        children: { explicitList: (GALLERY || []).slice(0, 3).map((_: any, i: number) => `g${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...(GALLERY || []).slice(0, 3).map((g: any, i: number) => ({
                    id: `g${i}`,
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: g.title,
                        image: g.image,
                        description: g.description,
                        url: g.url || ""
                      },
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "podcast":
      case "audio":
        return {
          format: "audio",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "audioCard" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  { id: "audioCard", component: { Card: { child: "audioContent" } } },
                  {
                    id: "audioContent",
                    component: {
                      Column: {
                        children: { explicitList: ["audioHeader", "audioPlayer", "audioDescription"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "audioHeader",
                    component: {
                      Row: {
                        children: { explicitList: ["audioIcon", "audioTitle"] },
                        distribution: "start",
                        alignment: "center",
                      },
                    },
                  },
                  { id: "audioIcon", component: { Icon: { name: "podcasts" } } },
                  { id: "audioTitle", component: { Text: { text: "Portfolio Deep Dive", usageHint: "h3" } } },
                  {
                    id: "audioPlayer",
                    component: {
                      AudioPlayer: {
                        url: "/assets/podcast.m4a",
                        audioTitle: `${PROFILE.name}: Career & Vision`,
                        audioDescription: "A personalized audio overview of Enrique's journey.",
                      },
                    },
                  },
                  {
                    id: "audioDescription",
                    component: {
                      Text: {
                        text: "A deep dive into Enrique's background as an architect and his vision for agentic workflows.",
                        usageHint: "body",
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

      case "matrix":
      case "creative":
        return {
          format: "matrix",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      StrategicMatrix: {
                        title: "Strategic Integration Matrix: Agentic workflows",
                        cells: [
                          {
                            id: "cell1",
                            phase: "Discovery Phase",
                            role: "Context Injection",
                            highlights: ["LLM Grounding", "Retrieval Augmented Generation (RAG)"],
                            impact: "Foundational baseline for all enterprise agents.",
                            color: "#4285F4",
                            logo: "search"
                          },
                          {
                            id: "cell2",
                            phase: "Reasoning Phase",
                            role: "Thought Chains",
                            highlights: ["Self-Correction", "Multi-step Planning"],
                            impact: "Enables agents to solve complex, non-linear problems.",
                            color: "#34A853",
                            logo: "psychology"
                          },
                          {
                            id: "cell3",
                            phase: "Action Phase",
                            role: "Tool Execution",
                            highlights: ["API Integration", "State Mutation"],
                            impact: "Transition from 'talking' AI to 'doing' AI.",
                            color: "#FBBC04",
                            logo: "bolt"
                          },
                          {
                            id: "cell4",
                            phase: "Governance Phase",
                            role: "Policy Guardrails",
                            highlights: ["Verification", "Traceability"],
                            impact: "Ensures safety and alignment at global scale.",
                            color: "#EA4335",
                            logo: "shield"
                          }
                        ]
                      }
                    }
                  }
                ],
              },
            },
          ],
        };

      case "charts":
      case "radar":
        return {
          format: "charts",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      SkillRadar: {
                        title: "Technical Proficiency Radar",
                        skills: [
                          { subject: "AI/ML", value: 95 },
                          { subject: "Cloud", value: 98 },
                          { subject: "Data", value: 90 },
                          { subject: "Strategy", value: 85 },
                          { subject: "Product", value: 88 }
                        ]
                      }
                    }
                  }
                ],
              },
            },
          ],
        };

      case "quiz":
        const lowerQuizContext = context.toLowerCase();
        let quizTitle = "Portfolio Challenge: General Knowledge 🧠";
        let quizQuestion = "How many professional cloud certifications does Enrique hold?";
        let quizCategory = "Certification Mastery";
        let quizOptions = [
          { label: "10x", value: "10", isCorrect: false },
          { label: "12x", value: "12", isCorrect: false },
          { label: "16x", value: "16", isCorrect: true },
          { label: "20x", value: "20", isCorrect: false }
        ];
        let quizExplanation = "Enrique holds 16 professional certifications: 8 Google Cloud, 6 AWS, plus SAFe and Splunk, demonstrating multi-cloud architecture depth.";

        if (lowerQuizContext.includes("google") || lowerQuizContext.includes("next") || lowerQuizContext.includes("cloud")) {
          quizTitle = "Cloud Challenge: Google Cloud Experience ☁️";
          quizQuestion = "Enrique served as a Lead AI Architect for which major event at Google?";
          quizCategory = "Google Career";
          quizOptions = [
            { label: "Google I/O", value: "io", isCorrect: false },
            { label: "Google Cloud Next '24", value: "next", isCorrect: true },
            { label: "Google Marketing Live", value: "marketing", isCorrect: false },
            { label: "Android Dev Summit", value: "android", isCorrect: false }
          ];
          quizExplanation = "Enrique was a Lead AI Architect for Google Cloud Next '24, where he architected high-visibility GenAI agent demos.";
        } else if (lowerQuizContext.includes("aws") || lowerQuizContext.includes("amazon")) {
          quizTitle = "Cloud Challenge: AWS Expertise 🟠";
          quizQuestion = "What was Enrique's primary role during his tenure at AWS?";
          quizCategory = "AWS Career";
          quizOptions = [
            { label: "Data Scientist", value: "ds", isCorrect: false },
            { label: "Technical Account Manager", value: "tam", isCorrect: false },
            { label: "Lead Solutions Architect", value: "sa", isCorrect: true },
            { label: "Product Manager", value: "pm", isCorrect: false }
          ];
          quizExplanation = "At AWS, Enrique was a Lead Solutions Architect, designing complex cloud transformations for global enterprise clients.";
        } else if (lowerQuizContext.includes("olympic") || lowerQuizContext.includes("oli") || lowerQuizContext.includes("game")) {
          quizTitle = "Innovation Challenge: The Olympic Games 🏅";
          quizQuestion = "What was the name of the AI agent Enrique architected for the Olympic Games?";
          quizCategory = "Major Projects";
          quizOptions = [
            { label: "Alexa", value: "alexa", isCorrect: false },
            { label: "Oli", value: "oli", isCorrect: true },
            { label: "Aura", value: "aura", isCorrect: false },
            { label: "Olympian", value: "olympian", isCorrect: false }
          ];
          quizExplanation = "Enrique architected 'Oli', a sophisticated AI agent that helped scale support and engagement for the Olympic Games.";
        } else if (lowerQuizContext.includes("agent") || lowerQuizContext.includes("a2ui") || lowerQuizContext.includes("workflow")) {
          quizTitle = "Future Challenge: Agentic AI ⚡";
          quizQuestion = "Enrique's work focuses on moving AI from 'Chat' interfaces to what next evolution?";
          quizCategory = "Thought Leadership";
          quizOptions = [
            { label: "Search Engine Optimization", value: "seo", isCorrect: false },
            { label: "Predictive Analytics", value: "analytics", isCorrect: false },
            { label: "Agentic Workflows (A2UI)", value: "a2ui", isCorrect: true },
            { label: "Blockchain Integration", value: "blockchain", isCorrect: false }
          ];
          quizExplanation = "Enrique is a pioneer in Agentic Workflows and A2UI (Agent-to-User Interface), transforming how AI autonomously executes tasks.";
        }

        return {
          format: "quiz",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "q1"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: quizTitle },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "q1",
                    component: {
                      QuizCard: {
                        question: quizQuestion,
                        category: quizCategory,
                        options: quizOptions,
                        explanation: quizExplanation
                      }
                    }
                  }
                ],
              },
            },
          ],
        };

      case "video":
        return {
          format: "video",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "videoCard" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  { id: "videoCard", component: { Card: { child: "videoContent" } } },
                  {
                    id: "videoContent",
                    component: {
                      Column: {
                        children: { explicitList: ["videoTitle", "videoPlayer", "videoDescription"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  { id: "videoTitle", component: { Text: { text: VIDEOS[0].title, usageHint: "h3" } } },
                  { id: "videoPlayer", component: { Video: { url: VIDEOS[0].url } } },
                  { id: "videoDescription", component: { Text: { text: VIDEOS[0].description, usageHint: "body" } } },
                ],
              },
            },
          ],
        };

      case "image":
      case "bubble":
        const bubbleImages = ["/assets/bubble_head.png", "/assets/bubble_head_2.png"];
        return {
          format: "bubble",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "bubbleRow"] },
                        distribution: "center",
                        alignment: "center",
                      }
                    }
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Portfolio Highlights: Bubble Heads" },
                        usageHint: "h3",
                      }
                    }
                  },
                  {
                    id: "bubbleRow",
                    component: {
                      Row: {
                        children: { explicitList: bubbleImages.map((_, i) => `b${i}`) },
                        distribution: "center",
                        alignment: "center",
                      }
                    }
                  },
                  ...bubbleImages.map((img: string, i: number) => ({
                    id: `b${i}`,
                    component: {
                      ProfileBubble: {
                        image: img,
                        size: "220px"
                      }
                    }
                  }))
                ]
              }
            }
          ]
        };

      case "weather":
        return {
          format: "weather",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "weatherCard"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Local Conditions: Seattle, WA 🌧️ ☁️" },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "weatherCard",
                    component: {
                      StrategicMatrix: {
                        title: "Current Weather: Seattle 📍",
                        cells: [
                          {
                            id: "w1",
                            phase: "Temperature",
                            role: "52°F",
                            highlights: ["Overcast", "Light Showers"],
                            impact: "Typical Seattle atmosphere ☔.",
                            color: "#4285F4",
                            logo: "cloud"
                          },
                          {
                            id: "w2",
                            phase: "Humidity",
                            role: "84%",
                            highlights: ["High moisture", "Soft mist"],
                            impact: "Coffee house weather ☕.",
                            color: "#34A853",
                            logo: "water_drop"
                          }
                        ]
                      }
                    }
                  }
                ],
              },
            },
          ],
        };

      case "stock":
        return {
          format: "stock",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "stockCard"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Market Flash: Alphabet Inc. (GOOGL) 📈" },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "stockCard",
                    component: {
                      StrategicMatrix: {
                        title: "Live Market Data: Nasdaq 📊",
                        cells: [
                          {
                            id: "s1",
                            phase: "Price",
                            role: "$192.45",
                            highlights: ["+2.34 (1.23%)", "At current close"],
                            impact: "Strong bullish momentum 🚀.",
                            color: "#34A853",
                            logo: "trending_up"
                          },
                          {
                            id: "s2",
                            phase: "Volume",
                            role: "24.5M",
                            highlights: ["High liquidity", "Institutional interest"],
                            impact: "Active trading session ✅.",
                            color: "#4285F4",
                            logo: "bar_chart"
                          }
                        ]
                      }
                    }
                  }
                ],
              },
            },
          ],
        };

      case "time":
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        return {
          format: "time",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "timeCard"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                  Text: {
                    text: { literalString: "Real-time Temporal Context 🕒" },
                    usageHint: "h3",
                  },
                },
              },
              {
                id: "timeCard",
                component: {
                  StrategicMatrix: {
                    title: "Current Time/Date",
                    cells: [
                      {
                        id: "t1",
                        phase: "Local Time",
                        role: timeStr,
                        highlights: ["Precision sync", "Region: Client Local"],
                        impact: "Moment-to-moment productivity.",
                        color: "#4285F4",
                        logo: "schedule"
                      },
                      {
                        id: "t2",
                        phase: "Calendar",
                        role: dateStr,
                        highlights: ["Standard ISO alignment", "Gregorian calendar"],
                        impact: "Day-level planning and context.",
                        color: "#34A853",
                        logo: "calendar_today"
                      }
                    ]
                  }
                }
              }
                ],
              },
            },
          ],
        };

      case "repositories":
        return {
          format: "repositories",
          surfaceId,
          source: { provider: "GitHub", url: PROFILE.links.github, title: "Open Source Repositories" },
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "repoRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Featured Open Source Repositories 🚀" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "repoRow",
                    component: {
                      Row: {
                        children: { explicitList: REPOSITORIES.map((_: any, i: number) => `r${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...REPOSITORIES.map((repo: any, i: number) => ({
                    id: `r${i}`,
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: repo.name,
                        description: repo.description,
                        image: "/assets/blog-optimizer.png",
                        url: repo.url
                      }
                    },
                  })),
                ],
              },
            },
          ],
        };

      case "general":
        // Context-aware fallback for general queries
        const lowerContext = context.toLowerCase();
        if (lowerContext.includes("weather") || lowerContext.includes("temp") || lowerContext.includes("rain") || lowerContext.includes("seattle")) {
          return this.getFallbackContent("weather", context);
        }
        if (lowerContext.includes("stock price") || (lowerContext.includes("market") && lowerContext.includes("data"))) {
          return this.getFallbackContent("stock", context);
        }
        if (lowerContext.includes("time") || lowerContext.includes("date") || lowerContext.includes("clock") || lowerContext.includes("today")) {
          return this.getFallbackContent("time", context);
        }
        if (lowerContext.includes("bubble")) {
          return this.getFallbackContent("bubble", context);
        }

        return {
          format: "general",
          surfaceId,
          a2ui: [
            { beginRendering: { surfaceId, root: "mainColumn" } },
            {
              surfaceUpdate: {
                surfaceId,
                components: [
                  {
                    id: "mainColumn",
                    component: {
                      Column: {
                        children: { explicitList: ["header", "summaryCard"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Personal Data Intelligence: Enrique K Chan 🧠" },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "summaryCard",
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: PROFILE.name,
                        description: PROFILE.summary,
                        image: "/assets/hero.png",
                        url: PROFILE.links.portfolio
                      }
                    }
                  }
                ],
              },
            },
          ],
        };

      default:
        return { format: "error", surfaceId, a2ui: [], error: `Unknown format: ${format}` };
    }
  }
}
