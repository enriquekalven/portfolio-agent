/*
 * A2A Client
 *
 * Client for communicating with the A2A agent that generates A2UI content.
 * This client talks to the remote agent (locally or on Agent Engine).
 */

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
    if (lowerFormat === "podcast" || lowerFormat === "audio" || lowerFormat === "video") {
      console.log(`[A2AClient] Using local fallback for ${format} (pre-built content)`);
      return this.getFallbackContent(format);
    }

    try {
      const response = await fetch(`${this.baseUrl}/a2a/query`, {
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
        console.log(`[A2AClient] Agent returned empty/error, using fallback for ${format}`);
        return this.getFallbackContent(format);
      }

      // Special case: if we requested a quiz but agent returned flashcards,
      // use our quiz fallback instead (agent doesn't know about QuizCard)
      if (format.toLowerCase() === "quiz") {
        const a2uiStr = JSON.stringify(data.a2ui);
        if (a2uiStr.includes("Flashcard") && !a2uiStr.includes("QuizCard")) {
          console.log(`[A2AClient] Agent returned Flashcards for quiz request, using QuizCard fallback`);
          return this.getFallbackContent(format);
        }
      }

      return data as A2UIResponse;
    } catch (error) {
      console.error("[A2AClient] Error calling agent:", error);

      // Return fallback content for demo purposes
      return this.getFallbackContent(format);
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
      yield { status: "complete", data: this.getFallbackContent(format) };
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
  private getFallbackContent(format: string): A2UIResponse {
    const surfaceId = "learningContent";

    switch (format.toLowerCase()) {
      case "flashcards":
        return {
          format: "flashcards",
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
                        text: { literalString: "Career Highlights: Enrique K Chan" },
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
                  {
                    id: "card1",
                    component: {
                      Flashcard: {
                        front: { literalString: "How does Enrique's background fit an AI Lead role?" },
                        back: {
                          literalString:
                            "Enrique combines 15+ years of distributed systems experience with a modern focus on Agentic AI. At Google, he led the technical delivery of the Olympic 'Oli' chatbot (Vertex AI), demonstrating an ability to scale GenAI to 40M+ viewers.",
                        },
                        category: { literalString: "Fit Analyzer" },
                      },
                    },
                  },
                  {
                    id: "card2",
                    component: {
                      Flashcard: {
                        front: { literalString: "What is Enrique's unique edge in Agentic workflows?" },
                        back: {
                          literalString:
                            "He specializes in the transition from simple RAG to autonomous agents that use tools. He co-authored the 'Intro to Agents' whitepaper and leads the AI Agents Enablement Center of Excellence at Google Cloud.",
                        },
                        category: { literalString: "Skill Matcher" },
                      },
                    },
                  },
                  {
                    id: "card3",
                    component: {
                      Flashcard: {
                        front: {
                          literalString:
                            "What is Enrique's architectural philosophy for AI?",
                        },
                        back: {
                          literalString:
                            "Architecture-first AI. He believes enterprise AI success depends on robust GenAI infrastructure (Cloud Run, AlloyDB, Vertex AI) and verifiable agentic logic rather than just prompt engineering.",
                        },
                        category: { literalString: "Visionary Fit" },
                      },
                    },
                  },
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
                  {
                    id: "audioCard",
                    component: { Card: { child: "audioContent" } },
                  },
                  {
                    id: "audioContent",
                    component: {
                      Column: {
                        children: {
                          explicitList: ["audioHeader", "audioPlayer", "audioDescription"],
                        },
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
                  {
                    id: "audioIcon",
                    component: {
                      Icon: { name: { literalString: "podcasts" } },
                    },
                  },
                  {
                    id: "audioTitle",
                    component: {
                      Text: {
                        text: {
                          literalString: "The Future of Agentic AI: A Portfolio Deep Dive",
                        },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "audioPlayer",
                    component: {
                      AudioPlayer: {
                        url: { literalString: "/assets/podcast.m4a" },
                        audioTitle: { literalString: "Enrique K Chan: Career & Vision" },
                        audioDescription: { literalString: "A personalized audio overview of Enrique's journey from Disney to Google Cloud AI." },
                      },
                    },
                  },
                  {
                    id: "audioDescription",
                    component: {
                      Text: {
                        text: {
                          literalString:
                            "Listen to this deep dive into Enrique's background as an architect of high-scale AI systems and his vision for the future of agentic workflows.",
                        },
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
                  {
                    id: "videoCard",
                    component: { Card: { child: "videoContent" } },
                  },
                  {
                    id: "videoContent",
                    component: {
                      Column: {
                        children: {
                          explicitList: ["videoTitle", "videoPlayer", "videoDescription"],
                        },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "videoTitle",
                    component: {
                      Text: {
                        text: { literalString: "The Rise of Agentic AI" },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "videoPlayer",
                    component: {
                      Video: {
                        url: { literalString: "https://www.youtube.com/watch?v=nZa5-WyN-rE" },
                      },
                    },
                  },
                  {
                    id: "videoDescription",
                    component: {
                      Text: {
                        text: {
                          literalString:
                            "Watch Enrique's keynote on the future of AI Agents and how they are transforming enterprise workflows.",
                        },
                        usageHint: "body",
                      },
                    },
                  },
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
                        children: { explicitList: ["header", "exp1", "exp2", "exp3"] },
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
                  {
                    id: "exp1",
                    component: {
                      ExperienceCard: {
                        company: "Google Cloud",
                        role: "Outbound Product Manager, Cloud AI",
                        period: "Nov 2025 – Present",
                        logo: "google",
                        color: "#4285F4",
                        highlights: [
                          "Leading vision and strategy for the AI Agents Enablement COE.",
                          "Co-authored global 'Intro to Agents' whitepaper (1.5M+ attendees).",
                        ],
                        impact: "Scaled Agentic AI enablement to 1.5M+ people globally.",
                      },
                    },
                  },
                  {
                    id: "exp2",
                    component: {
                      ExperienceCard: {
                        company: "Google Cloud",
                        role: "Senior AI Consultant, PSO",
                        period: "Jun 2023 – Nov 2025",
                        logo: "google",
                        color: "#34A853",
                        highlights: [
                          "NBC Olympic Concierge: Technical lead for GenAI solution serving 40M viewers.",
                          "Secured $1.3M revenue commitment for Vertex AI throughput.",
                        ],
                        impact: "Delivered 99.99% availability for 90M+ Olympic queries.",
                      },
                    },
                  },
                  {
                    id: "exp3",
                    component: {
                      ExperienceCard: {
                        company: "Amazon Web Services (AWS)",
                        role: "Senior Cloud Architect",
                        period: "May 2020 – May 2021",
                        logo: "aws",
                        color: "#FF9900",
                        highlights: [
                          "Designed large-scale cloud architectures for Fortune 500 enterprise clients.",
                          "Built distributed microservices with TypeScript and AWS CDK.",
                        ],
                        impact: "Modernized legacy infrastructures into high-availability cloud systems.",
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

      case "video_cards":
        return {
          format: "video_cards",
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
                        children: { explicitList: ["header", "videoRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Featured Video Content" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "videoRow",
                    component: {
                      Row: {
                        children: { explicitList: ["v1", "v2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "v1",
                    component: {
                      PortfolioCard: {
                        type: "video",
                        title: "The Rise of Agentic AI",
                        description: "Enrique's keynote on the transition to autonomous AI agents.",
                        image: "https://img.youtube.com/vi/nZa5-WyN-rE/maxresdefault.jpg",
                        url: "https://www.youtube.com/watch?v=nZa5-WyN-rE"
                      }
                    },
                  },
                  {
                    id: "v2",
                    component: {
                      PortfolioCard: {
                        type: "video",
                        title: "A2UI & Agentic Interfaces",
                        description: "A deep dive into high-fidelity Agentic User Interfaces.",
                        image: "https://img.youtube.com/vi/ZMIAlxx-Jx4/maxresdefault.jpg",
                        url: "https://www.youtube.com/watch?v=ZMIAlxx-Jx4"
                      }
                    },
                  },
                ],
              },
            },
          ],
        };

      case "blog_cards":
        return {
          format: "blog_cards",
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
                        children: { explicitList: ["header", "blogRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "header",
                    component: {
                      Text: {
                        text: { literalString: "Medium Articles & Thought Leadership" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "blogRow",
                    component: {
                      Row: {
                        children: { explicitList: ["b1", "b2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "b1",
                    component: {
                      PortfolioCard: {
                        type: "blog",
                        title: "Building Agentic Interfaces",
                        description: "Introducing the Agent UI Starter Pack and the philosophy of agent-first design.",
                        image: "/assets/blog-a2ui.png",
                        url: "https://medium.com/@enriq/building-the-future-of-agentic-interfaces-introducing-the-agent-ui-starter-pack-94d8fed86ca7"
                      }
                    },
                  },
                  {
                    id: "b2",
                    component: {
                      PortfolioCard: {
                        type: "blog",
                        title: "The Agent Optimizer",
                        description: "A guide to optimizing agent performance in complex enterprise workflows.",
                        image: "/assets/blog-optimizer.png",
                        url: "https://medium.com/@enriq/introducing-the-agent-optimizer-for-google-adk-3872856e6d7b"
                      }
                    },
                  },
                ],
              },
            },
          ],
        };

      case "awards":
        return {
          format: "awards",
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
                        text: { literalString: "Key Industry Awards & Honors" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "awardRow",
                    component: {
                      Row: {
                        children: { explicitList: ["a1", "a2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "a1",
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: "AIS Offsite Hackathon Winner",
                        description: "Won 1st place for the 'Cards Against Humanity Agent' at the 2025 Google AIS Offsite.",
                        image: "/assets/awards.png",
                        url: "https://www.linkedin.com/feed/update/urn:li:activity:7265882565578702848/"
                      }
                    },
                  },
                  {
                    id: "a2",
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: "Cloud GTM Excellence Award",
                        description: "Recognized for exceptional impact on Google Cloud's go-to-market strategy.",
                        image: "/assets/awards.png",
                        url: "https://www.linkedin.com/in/enriquechan/details/honors/"
                      }
                    },
                  },
                ],
              },
            },
          ],
        };

      case "certs":
        return {
          format: "certs",
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
                        text: { literalString: "Professional Cloud Certifications" },
                        usageHint: "h2",
                      },
                    },
                  },
                  {
                    id: "certRow",
                    component: {
                      Row: {
                        children: { explicitList: ["c1", "c2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "c1",
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: "Google Cloud Professional ML Engineer",
                        description: "10x Google Cloud Certified, specializing in enterprise ML and AI architecture.",
                        image: "/assets/certs.png",
                        url: "https://www.credential.net/profile/enriquekchan"
                      }
                    },
                  },
                  {
                    id: "c2",
                    component: {
                      PortfolioCard: {
                        type: "project",
                        title: "AWS Solutions Architect Professional",
                        description: "7x AWS Certified with deep expertise in high-scale cloud systems.",
                        image: "/assets/certs.png",
                        url: "https://www.credly.com/users/enrique-chan"
                      }
                    },
                  },
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
                        children: { explicitList: ["s1", "s2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "s1",
                    component: {
                      PortfolioCard: {
                        type: "video",
                        title: "Keynote: Rise of Agentic AI",
                        description: "Leading the transition from RAG to Agentic Workflows at scale.",
                        image: "/assets/speaker.png",
                        url: "https://www.youtube.com/watch?v=nZa5-WyN-rE"
                      }
                    },
                  },
                  {
                    id: "s2",
                    component: {
                      PortfolioCard: {
                        type: "video",
                        title: "Building Agentic Interfaces",
                        description: "Explaining high-fidelity UI for AI assistants at the Google ADK summit.",
                        image: "/assets/speaker.png",
                        url: "https://www.youtube.com/watch?v=ZMIAlxx-Jx4"
                      }
                    },
                  },
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
                        children: { explicitList: ["t1", "t2", "t3"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "t1",
                    component: {
                      Flashcard: {
                        front: { literalString: "Thomas Kurian (CEO, Google Cloud)" },
                        back: {
                          literalString:
                            "Thank you for your work and commitment to leading with customer empathy and engineering excellence.",
                        },
                        category: { literalString: "Googler Feedback" },
                      },
                    },
                  },
                  {
                    id: "t2",
                    component: {
                      Flashcard: {
                        front: { literalString: "Michael Clark (President, Google Cloud NorthAm)" },
                        back: {
                          literalString:
                            "Congratulations on being awarded a GTM Cloud Regional Award for your technical impact.",
                        },
                        category: { literalString: "Googler Feedback" },
                      },
                    },
                  },
                  {
                    id: "t3",
                    component: {
                      Flashcard: {
                        front: { literalString: "Brian Delahunty (VP Agents platform, Google)" },
                        back: {
                          literalString:
                            "Incredible work on the 'Intro to Agents' whitepaper. You've set a high bar for agentic enablement.",
                        },
                        category: { literalString: "Googler Feedback" },
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

      case "quiz":
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
                        children: { explicitList: ["headerText", "quizRow"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "headerText",
                    component: {
                      Text: {
                        text: { literalString: "Quick Quiz: Enrique's Career" },
                        usageHint: "h3",
                      },
                    },
                  },
                  {
                    id: "quizRow",
                    component: {
                      Row: {
                        children: { explicitList: ["quiz1", "quiz2"] },
                        distribution: "start",
                        alignment: "stretch",
                      },
                    },
                  },
                  {
                    id: "quiz1",
                    component: {
                      QuizCard: {
                        question: {
                          literalString:
                            "Which of these was NOT a major cloud platform Enrique worked on?",
                        },
                        options: [
                          {
                            label: { literalString: "Google Cloud" },
                            value: "a",
                            isCorrect: false,
                          },
                          {
                            label: { literalString: "AWS" },
                            value: "b",
                            isCorrect: false,
                          },
                          {
                            label: { literalString: "Oracle Cloud" },
                            value: "c",
                            isCorrect: true,
                          },
                          {
                            label: { literalString: "Microsoft Azure" },
                            value: "d",
                            isCorrect: false,
                          },
                        ],
                        explanation: {
                          literalString:
                            "Enrique has extensive experience across the 'Big Three' - Google Cloud (10x certified), AWS (7x certified), and Azure (2x certified). While he has an architectural background in these, Oracle Cloud is not listed in his core certifications or experience.",
                        },
                        category: { literalString: "Cloud Experience" },
                      },
                    },
                  },
                  {
                    id: "quiz2",
                    component: {
                      QuizCard: {
                        question: {
                          literalString:
                            "Enrique's work on the 'Oli' chatbot served how many viewers?",
                        },
                        options: [
                          {
                            label: { literalString: "1 Million" },
                            value: "a",
                            isCorrect: false,
                          },
                          {
                            label: { literalString: "10 Million" },
                            value: "b",
                            isCorrect: false,
                          },
                          {
                            label: { literalString: "40 Million" },
                            value: "c",
                            isCorrect: true,
                          },
                          {
                            label: { literalString: "100 Million" },
                            value: "d",
                            isCorrect: false,
                          },
                        ],
                        explanation: {
                          literalString:
                            "The NBC Olympic 'Oli' chatbot was a massive success, serving 40 million viewers and handling over 90 million queries during the games!",
                        },
                        category: { literalString: "Impact" },
                      },
                    },
                  },
                ],
              },
            },
          ],
        };

      default:
        return {
          format: "error",
          surfaceId,
          a2ui: [],
          error: `Unknown format: ${format}`,
        };
    }
  }
}
