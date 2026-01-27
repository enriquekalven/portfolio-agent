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

    // For audio/video, always use local fallback content.
    // The deployed agent returns GCS URLs which won't work locally,
    // and we only have one pre-built podcast/video anyway.
    const lowerFormat = format.toLowerCase();

    const backendFormat = lowerFormat === "blog" ? "blog_cards" : (lowerFormat === "video" || lowerFormat === "video_cards") ? "video_cards" : lowerFormat;

    if (
      backendFormat === "podcast" ||
      backendFormat === "audio" ||
      backendFormat === "video" ||
      backendFormat === "blog_cards" ||
      backendFormat === "video_cards" ||
      backendFormat === "awards" ||
      backendFormat === "certs" ||
      backendFormat === "speaker" ||
      backendFormat === "testimonials" ||
      backendFormat === "gallery" ||
      backendFormat === "timeline"
    ) {
      console.log(`[A2AClient] Using local fallback for ${format} (pre-built content)`);
      return this.getFallbackContent(backendFormat, context);
    }

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

      // Check if the response has valid A2UI content
      // If empty, has an error, or agent couldn't fulfill request, use fallback
      if (
        !data.a2ui ||
        data.a2ui.length === 0 ||
        data.error ||
        data.rawText?.includes("cannot fulfill") ||
        data.rawText?.includes("do not have the functionality")
      ) {
        console.log(`[A2AClient] Agent returned empty/error, using fallback for ${backendFormat}`);
        return this.getFallbackContent(backendFormat, context);
      }

      // Special case: if we requested a quiz but agent returned flashcards,
      // use our quiz fallback instead (agent doesn't know about QuizCard)
      if (backendFormat === "quiz") {
        const a2uiStr = JSON.stringify(data.a2ui);
        if (a2uiStr.includes("Flashcard") && !a2uiStr.includes("QuizCard")) {
          console.log(`[A2AClient] Agent returned Flashcards for quiz request, using QuizCard fallback`);
          return this.getFallbackContent(backendFormat, context);
        }
      }

      return data as A2UIResponse;
    } catch (error) {
      console.error("[A2AClient] Error calling agent:", error);

      // Return fallback content for demo purposes
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
    const { PROFILE, EXPERIENCE, CERTIFICATIONS, AWARDS, TESTIMONIALS, BLOGS, VIDEOS, SPEAKING, GALLERY } = portfolioData;

    switch (format.toLowerCase()) {
      case "flashcards":
        const skillPool = [
          {
            front: "What is his unique edge in Agentic workflows?",
            back: "Specializes in transition from RAG to autonomous agents. Leads AI Agents Enablement COE at Google Cloud.",
            category: "Skill Matcher"
          },
          {
            front: "Which Cloud platforms is Enrique certified in?",
            back: "Enrique holds 19x professional certifications across Google Cloud, AWS, and Microsoft Azure.",
            category: "Cloud Mastery"
          },
          {
            front: "What are his core AI/ML competencies?",
            back: "Vertex AI, LLMOps, RLHF, SFT, and building autonomous agent substrates.",
            category: "Technical Skills"
          },
          {
            front: "How does he approach Enterprise Data?",
            back: "Expert in BigQuery, Data Mesh architecture, and migrating legacy analytics to modern AI-ready stacks.",
            category: "Data Strategy"
          }
        ];

        const fitPool = [
          {
            front: `How does ${PROFILE.name.split(' ')[0]}'s background fit an AI Lead role?`,
            back: `Combining 15+ years of distributed systems with a focus on Agentic AI. Lead on NBC Olympics 'Oli' chatbot for 40M viewers.`,
            category: "Fit Analyzer"
          },
          {
            front: "What is his architectural philosophy for AI?",
            back: "Architecture-first AI. Success depends on GenAI infrastructure (Cloud Run, Vertex AI) and verifiable logic.",
            category: "Visionary Fit"
          },
          {
            front: "Why is Enrique a good fit for high-scale AI systems?",
            back: "Proven track record scaling Disney+ and Disney MagicBands globally. Expert in high-availability cloud architecture.",
            category: "Enterprise Fit"
          },
          {
            front: "What did he achieve with the NBC Olympics chatbot?",
            back: "Handled 90M+ queries with sub-second latency for 40M viewers using Vertex AI Provisioned Throughput.",
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
                        front: { literalString: card.front },
                        back: { literalString: card.back },
                        category: { literalString: card.category },
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
                        children: { explicitList: ["header", ...EXPERIENCE.map((_, i) => `exp${i}`)] },
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
                        impact: exp.impact,
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
                        children: { explicitList: AWARDS.slice(0, 3).map((_, i) => `a${i}`) },
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
                        children: { explicitList: CERTIFICATIONS.slice(0, 3).map((_, i) => `c${i}`) },
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
                        description: cert.description,
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
                        children: { explicitList: SPEAKING.slice(0, 2).map((_, i) => `s${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...SPEAKING.slice(0, 2).map((s: any, i: number) => ({
                    id: `s${i}`,
                    component: {
                      Flashcard: {
                        front: { literalString: s.title },
                        back: { literalString: s.description },
                        category: { literalString: "Public Speaking" }
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
                        children: { explicitList: TESTIMONIALS.slice(0, 3).map((_, i) => `t${i}`) },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  ...TESTIMONIALS.slice(0, 3).map((t: any, i: number) => ({
                    id: `t${i}`,
                    component: {
                      Flashcard: {
                        front: { literalString: t.author },
                        back: { literalString: t.quote },
                        category: { literalString: "Googler Feedback" },
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
                        children: { explicitList: (GALLERY || []).slice(0, 3).map((_, i) => `g${i}`) },
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
                  { id: "audioIcon", component: { Icon: { name: { literalString: "podcasts" } } } },
                  { id: "audioTitle", component: { Text: { text: { literalString: "Portfolio Deep Dive" }, usageHint: "h3" } } },
                  {
                    id: "audioPlayer",
                    component: {
                      AudioPlayer: {
                        url: { literalString: "/assets/podcast.m4a" },
                        audioTitle: { literalString: `${PROFILE.name}: Career & Vision` },
                        audioDescription: { literalString: "A personalized audio overview of Enrique's journey." },
                      },
                    },
                  },
                  {
                    id: "audioDescription",
                    component: {
                      Text: {
                        text: { literalString: "A deep dive into Enrique's background as an architect and his vision for agentic workflows." },
                        usageHint: "body",
                      },
                    },
                  },
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
                  { id: "videoTitle", component: { Text: { text: { literalString: VIDEOS[0].title }, usageHint: "h3" } } },
                  { id: "videoPlayer", component: { Video: { url: { literalString: VIDEOS[0].url } } } },
                  { id: "videoDescription", component: { Text: { text: { literalString: VIDEOS[0].description }, usageHint: "body" } } },
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
