SURFACE_ID = "portfolioContent"

# Flashcard A2UI template
FLASHCARD_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["card1", "card2", "card3"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "card1",
          "component": {{
            "Flashcard": {{
              "front": {{"literalString": "[SPECIFIC_DATA_QUESTION_ABOUT_EXPERIENCE]"}},
              "back": {{"literalString": "[HIGH_IMPACT_ANSWER_FROM_EXPERIENCE_DATA]"}},
              "category": {{"literalString": "[RELEVANT_CATEGORY]"}}
            }}
          }}
        }}
        // Add card2, card3 following the same pattern with unique IDs
      ]
    }}
  }}
]
"""

# Quiz A2UI template
QUIZ_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["q1"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "q1",
          "component": {{
            "QuizCard": {{
              "question": {{"literalString": "Which company did Enrique NOT work for?"}},
              "options": [
                {{"label": {{"literalString": "Google"}}, "value": "google", "isCorrect": false}},
                {{"label": {{"literalString": "Netflix"}}, "value": "netflix", "isCorrect": true}},
                {{"label": {{"literalString": "AWS"}}, "value": "aws", "isCorrect": false}}
              ],
              "explanation": {{"literalString": "Enrique has worked at Google, AWS, and Accenture, but never Netflix."}},
              "category": {{"literalString": "Career Trivia"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Image A2UI template
IMAGE_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{"Image": {{"url": "/assets/hero.png", "alt": "Enrique K Chan"}}}}
        }}
      ]
    }}
  }}
]
"""

# Video A2UI template
VIDEO_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{"Video": {{"url": "https://www.youtube.com/watch?v=nZa5-WyN-rE"}}}}
        }}
      ]
    }}
  }}
]
"""

# Audio A2UI template
AUDIO_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{"Audio": {{"url": "/assets/podcast.m4a", "title": "Enrique's AI Vision"}}}}
        }}
      ]
    }}
  }}
]
"""

# Timeline A2UI template
TIMELINE_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "exp1", "exp2", "exp3"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Career Historian 📜"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "exp1",
          "component": {{
            "ExperienceCard": {{
              "company": "Google Cloud",
              "role": "Outbound Product Manager, Cloud AI",
              "period": "Nov 2025 \u2013 Present",
              "logo": "google",
              "color": "#4285F4",
              "highlights": ["Highlight 1", "Highlight 2"],
              "impact": "Multi-million dollar impact..."
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Video Cards A2UI template
VIDEO_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "videoGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Cinema Hub 🎬"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "videoGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["v1", "v2", "v3", "v4"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "v1",
          "component": {{
            "PortfolioCard": {{
              "type": "video",
              "title": {{"literalString": "Rise of Agentic AI"}},
              "description": {{"literalString": "Enrique's keynote on the transition to autonomous AI agents."}},
              "image": {{"literalString": "https://img.youtube.com/vi/nZa5-WyN-rE/maxresdefault.jpg"}},
              "url": {{"literalString": "https://www.youtube.com/watch?v=nZa5-WyN-rE"}}
            }}
          }}
        }},
        {{
          "id": "v2",
          "component": {{
            "PortfolioCard": {{
              "type": "video",
              "title": {{"literalString": "A2UI & Agentic Interfaces"}},
              "description": {{"literalString": "A deep dive into high-fidelity Agentic User Interfaces."}},
              "image": {{"literalString": "https://img.youtube.com/vi/ZMIAlxx-Jx4/maxresdefault.jpg"}},
              "url": {{"literalString": "https://www.youtube.com/watch?v=ZMIAlxx-Jx4"}}
            }}
          }}
        }}
        // ... v3 and v4 unique IDs
      ]
    }}
  }}
]
"""

# Blog Cards A2UI template
BLOG_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "blogRow1", "blogRow2"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "header",
          "component": {{"Text": {{"text": {{"literalString": "Insight Stream ✍️"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "blogRow1",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["b1", "b2", "b3"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "blogRow2",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["b4", "b5", "b6"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "b1",
          "component": {{
            "PortfolioCard": {{
              "type": "blog",
              "title": {{"literalString": "Intro to Agents Whitepaper"}},
              "description": {{"literalString": "The definitive Kaggle guide to the future of AI agents."}},
              "image": {{"literalString": "/assets/blog-a2ui.png"}},
              "url": {{"literalString": "https://www.kaggle.com/whitepaper-introduction-to-agents"}}
            }}
          }}
        }},
        {{
          "id": "b2",
          "component": {{
            "PortfolioCard": {{
              "type": "blog",
              "title": {{"literalString": "Advent of Agents"}},
              "description": {{"literalString": "A 25-day journey into building and deploying agentic workflows."}},
              "image": {{"literalString": "/assets/blog-optimizer.png"}},
              "url": {{"literalString": "https://adventofagents.com/"}}
            }}
          }}
        }}
        // ... b3 through b6 unique IDs
      ]
    }}
  }}
]
"""

# Awards A2UI template
AWARDS_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "awardGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Trophy Room 🏆"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "awardGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["a1", "a2"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "a1",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": {{"literalString": "GTM Cloud Tech Impact Award"}},
              "description": {{"literalString": "Recognized for the massive scale impact of the Olympic 'Oli' chatbot."}},
              "image": {{"literalString": "/assets/award_gtm_2024.jpg"}},
              "url": {{"literalString": "https://www.google.com/search?q=nbc+olympics+oli+ai"}}
            }}
          }}
        }},
        {{
          "id": "a2",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": {{"literalString": "AIS Offsite Hackathon Winner"}},
              "description": {{"literalString": "Won 1st place for the 'Cards Against Humanity Agent' at the 2025 Google AIS Offsite."}},
              "image": {{"literalString": "/assets/awards.png"}},
              "url": {{"literalString": "https://www.linkedin.com/feed/update/urn:li:activity:7265882565578702848/"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Gallery A2UI template
GALLERY_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "galleryGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Hall of Mastery 🖼️"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "galleryGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["g1", "g2", "g3"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "g1",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": {{"literalString": "[IMAGE_TITLE]"}},
              "description": {{"literalString": "[IMAGE_DESCRIPTION]"}},
              "image": {{"literalString": "[IMAGE_PATH]"}}
            }}
          }}
        }}
        // Add g2, g3 pattern
      ]
    }}
  }}
]
"""

# Certifications A2UI template
CERT_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "certGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Cloud Badge Wall ☁️"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "certGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["c1", "c2"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "c1",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": {{"literalString": "Google Cloud Professional ML Engineer"}},
              "description": {{"literalString": "10x Google Cloud Certified, specializing in enterprise ML and AI architecture."}},
              "image": {{"literalString": "/assets/certs.png"}},
              "url": {{"literalString": "https://www.credential.net/profile/enriquekchan"}}
            }}
          }}
        }},
        {{
          "id": "c2",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": {{"literalString": "AWS Solutions Architect Professional"}},
              "description": {{"literalString": "7x AWS Certified with deep expertise in high-scale cloud systems."}},
              "image": {{"literalString": "/assets/certs.png"}},
              "url": {{"literalString": "https://www.credly.com/users/enrique-chan"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Comics A2UI template
COMIC_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "comicGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "The Agentic Adventures 📂"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "comicGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["c1", "c2", "c3"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "c1",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": {{"literalString": "Business Leaders Edition"}},
              "description": {{"literalString": "The Architect's Secret Files: Unlocking the future of AI for leaders."}},
              "image": {{"literalString": "/assets/agent_comic.png"}},
              "url": {{"literalString": "https://enriquekchan.web.app/agent_adventures_business_leaders.pdf"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Speaker A2UI template
SPEAKER_CARDS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "speakerGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Stage Presence 🎤"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "speakerGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["s1", "s2"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "s1",
          "component": {{
            "Flashcard": {{
              "front": {{"literalString": "[EVENT_NAME_AND_DATE]"}},
              "back": {{"literalString": "[TALK_TITLE_AND_IMPACT_HINT]"}},
              "category": {{"literalString": "[SESSION_TYPE]"}}
            }}
          }}
        }},
        {{
          "id": "s2",
          "component": {{
            "Flashcard": {{
              "front": {{"literalString": "[EVENT_NAME_AND_DATE]"}},
              "back": {{"literalString": "[TALK_TITLE_AND_IMPACT_HINT]"}},
              "category": {{"literalString": "[SESSION_TYPE]"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Testimonials A2UI template
TESTIMONIALS_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["header", "tGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
            "id": "header",
            "component": {{"Text": {{"text": {{"literalString": "Googler Vibes ✨"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "tGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["t1", "t2", "t3"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "t1",
          "component": {{
            "Flashcard": {{
              "front": {{"literalString": "[LEADER_NAME_AND_TITLE]"}},
              "back": {{"literalString": "[SPECIFIC_DATA_DRIVEN_QUOTE]"}},
              "category": {{"literalString": "[IMPACT_CATEGORY]"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Strategic Matrix A2UI template
STRATEGIC_MATRIX_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "StrategicMatrix": {{
              "title": "Strategic Integration Matrix: Agentic workflows",
              "cells": [
                {{
                  "id": "cell1",
                  "phase": "Discovery Phase",
                  "role": "Context Injection",
                  "highlights": ["LLM Grounding", "Retrieval Augmented Generation (RAG)"],
                  "impact": "Foundational baseline for all enterprise agents.",
                  "color": "#4285F4",
                  "logo": "search"
                }}
              ]
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

# Skill Radar A2UI template
SKILL_RADAR_EXAMPLE = f"""
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "SkillRadar": {{
              "title": "Technical Proficiency",
              "skills": [
                {{"subject": "AI/ML", "value": 95}},
                {{"subject": "Cloud", "value": 98}},
                {{"subject": "Data", "value": 90}},
                {{"subject": "Strategy", "value": 85}},
                {{"subject": "Engineering", "value": 92}}
              ]
            }}
          }}
        }}
      ]
    }}
  }}
]
"""

def get_system_prompt(format_type: str, portfolio_data: str, topic: str = "") -> str:
    """
    Generate the system prompt for A2UI generation for the portfolio.
    """
    examples = {
        "flashcards": FLASHCARD_EXAMPLE,
        "quiz": QUIZ_EXAMPLE,
        "image": IMAGE_EXAMPLE,
        "video": VIDEO_EXAMPLE,
        "audio": AUDIO_EXAMPLE,
        "timeline": TIMELINE_EXAMPLE,
        "video_cards": VIDEO_CARDS_EXAMPLE,
        "blog_cards": BLOG_CARDS_EXAMPLE,
        "awards": AWARDS_CARDS_EXAMPLE,
        "certs": CERT_CARDS_EXAMPLE,
        "speaker": SPEAKER_CARDS_EXAMPLE,
        "testimonials": TESTIMONIALS_EXAMPLE,
        "gallery": GALLERY_CARDS_EXAMPLE,
        "matrix": STRATEGIC_MATRIX_EXAMPLE,
        "charts": SKILL_RADAR_EXAMPLE,
        "comics": COMIC_CARDS_EXAMPLE,
    }

    example = examples.get(format_type.lower(), FLASHCARD_EXAMPLE)

    if format_type.lower() == "timeline":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see professional career history as a sequential downward timeline.
FOCUS TOPIC: {topic}

## Enrique's Professional Data
{portfolio_data}

## Your Task
Return A2UI JSON using the 'ExperienceCard' custom component.
- Display all major relevant roles from the EXPERIENCE data.
- Use sequential IDs (exp1, exp2, etc).
- For 'logo', use 'google' if company is Google, 'aws' if Amazon, 'accenture' if Accenture.
- Ensure 'impact' is included for each role to demonstrate high-level value.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "blog_cards":
        return f"""You are Enrique K Chan's Portfolio Agent.
Represent Enrique's technical blogs and whitepapers as a nice grid of cards.

## Enrique's Portfolio Data
{portfolio_data}

## Your Task
Return A2UI JSON with 6 cards split across two Rows (3 cards per row).
- **TOP PRIORITY (Indices 1 & 2)**: 
    1. The "Intro to Agents Whitepaper" (Kaggle).
    2. The "Advent of Agents" project.
- **Remaining 4 Cards**: Choose the most relevant technical blogs from the BLOGS data.
- Use two Rows: 'blogRow1' (b1, b2, b3) and 'blogRow2' (b4, b5, b6).
- Each Card should have an 'onAction' link to the medium/kaggle URL.
- Use 'PortfolioCard' component with type 'blog'.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "video_cards":
        return f"""You are Enrique K Chan's Portfolio Agent.
Represent Enrique's YouTube videos as high-quality cards.

## Enrique's Video Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of exactly 4 PortfolioCards.
- Use type 'video' for these cards.
- Provide a clear title and description.
- Pull details from the VIDEOS section of the profile.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "certs":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see Enrique's cloud certifications.

## Enrique's Certification Data
{portfolio_data}

## Your Task
Return A2UI JSON with a grid of PortfolioCards.
- **CRITICAL**: You MUST name EACH certification individually (e.g., 'Professional ML Engineer', 'Professional Cloud Architect', 'AWS Solutions Architect Pro').
- **DO NOT SUMMARIZE**: If the data says "10x Google Cloud Certified", you must still attempt to list the individual titles based on the context.
- Provide a card for EVERY certification found in the data.
- Use type 'project' for these cards and '/assets/certs.png' for the image.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "speaker":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see Enrique's top speaking events and keynotes.

## Enrique's Speaking Data
{portfolio_data}

## Your Task
Return A2UI JSON using 'Flashcard' components in a Row.
- **CRITICAL**: Prioritize the 'Google Cloud Next' events (Las Vegas/San Francisco).
- Use high-fidelity naming (e.g., 'Solutions Talk: Architecting GenAI Agents').
- The front: Event Name, Location, and Date.
- The back: Talk Title, Key Takeaways, and Audience Impact.
- Maintain a premium, executive tone.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "awards":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see Enrique's major awards, honors, and trophies.

## Enrique's Award Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of PortfolioCards.
- Use type 'project' for these cards.
- **MANDATORY**: For any award mentioning 'Cloud Tech Impact' or 'Trophy', you MUST use the image '/assets/award_gtm_2024.jpg'. This is the high-fidelity trophy photo from Enrique's website.
- For other awards (like 'AIS Hackathon' or 'GTM Excellence'), use '/assets/awards.png'.
- Descriptions should highlight the massive scale and business impact (e.g., 'NBCU Olympic Chatbot serving 40M viewers').
- Ensure titles are clean and professional (e.g. 'Cloud Tech Impact Award 2024').

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "testimonials":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see "What Googlers Say" about Enrique.

## Enrique's Testimonial Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of Flashcards.
- Each flashcard should feature a quote from a Googler or Google leader.
- The front: Persona/Author (e.g., 'CEO, Google Cloud').
- The back: The specific quote or piece of feedback.
- Use categories like 'Technical Rigor', 'Leadership', 'Innovation'.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "flashcards":
        # Dynamic tailoring based on topic keywords
        task_instruction = "Create 3-4 high-quality flashcards about Enrique's professional journey."
        
        topic_lower = topic.lower()
        if "fit" in topic_lower or "analyzer" in topic_lower:
            task_instruction = "FOCUS: Fit Analyzer. Create 3-4 cards comparing Enrique's specific experience (Google Cloud, AWS, Scale) to typical Senior AI/Product Lead requirements. Focus on why he's the right choice for high-stakes AI."
        elif "skill" in topic_lower or "match" in topic_lower:
            task_instruction = "FOCUS: Skill Matcher. Create 3-4 cards illustrating how his deep skills (MLOps, Vertex AI, Agent Governance) apply to specific enterprise problems. Focus on technical depth and impact."
        elif "timeline" in topic_lower or "historian" in topic_lower or "career" in topic_lower:
            task_instruction = "FOCUS: Career Historian. Create 3-4 cards showing the narrative progression from Disney's MagicBands to AWS to Google Cloud's Agentic AI transition."
        elif "project" in topic_lower or "work" in topic_lower:
            task_instruction = "FOCUS: Project Spotlight. Create 3-4 cards exploring the technical complexity and impact of his projects (Oli AI, Disney+ rollout, Advent of Agents)."

        return f"""You are Enrique K Chan's Portfolio Agent. 
You are helping recruiters/hiring managers learn about Enrique's unique value proposition.

## Enrique's Professional Profile
{portfolio_data}

## Your Task
{task_instruction}

**VARIETY RULE**: Generate a UNIQUE set of cards every time. Do not repeat the same cards from previous sessions. Use different categories and angles (e.g., 'Leadership', 'Scale', 'Governance', 'Architecture').

## Rules
- Output ONLY valid JSON - no markdown, no explanation
- Use surfaceId: "{SURFACE_ID}"
- Category: Use logical, high-signal categories.

A2UI JSON Template:
{FLASHCARD_EXAMPLE}
"""

    if format_type.lower() == "image":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see a picture, avatar, or visual achievement.

## Portfolio Data
{portfolio_data}

## Your Task
Return A2UI JSON containing an 'Image' component OR a 'ProfileBubble' component.
- **VARIANT RULE**: If the user mentions "bubble" or "avatar", you MUST use the **'ProfileBubble'** custom component.
- If they ask for his profile pic, use "/assets/hero.png".
- If they ask for the Olympics project architecture, use "/assets/architecture.jpg".

A2UI JSON Template for Image:
{IMAGE_EXAMPLE}

A2UI JSON Template for ProfileBubble:
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{"ProfileBubble": {{"image": "/assets/hero.png", "size": "240px"}}}}
        }}
      ]
    }}
  }}
]
"""

    if format_type.lower() == "video":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see a video or presentation.

## Portfolio Data
{portfolio_data}

## Your Task
Return A2UI JSON containing a 'Video' component with a YouTube URL.
If no specific video is found, use a placeholder or related AI talk.

A2UI JSON Template:
{VIDEO_EXAMPLE}
"""

    if format_type.lower() == "quiz":
        return f"""You are Enrique K Chan's Portfolio Agent.
Create a HIGH-QUALITY, DYNAMIC quiz about Enrique's background based on the data provided.

## Enrique's Data
{portfolio_data}

## Your Task
Return A2UI JSON using the 'QuizCard' component.
- **VARIETY RULE**: DO NOT repeat the same questions. Generate a DIFFERENT set of questions every time (e.g., about his certifications, his specific Olympic metrics, his tenure at Accenture, or his Seattle location).
- Provide 3-4 options per question with 1 correct answer.
- Include a technical explanation for the answer.
- Tone: Engaging and professional.

A2UI JSON Template (Blueprint):
{QUIZ_EXAMPLE}
"""

    if format_type.lower() == "comics":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user has unlocked the ARCHITECT'S SECRET FILES (The Agent Adventures Comics).

## Comic Data
{portfolio_data}

## Your Task
Return A2UI JSON featuring the comics as interactive PortfolioCards.
- List all available comic issues/editions from the COMICS data.
- Use 'PortfolioCard' component with type 'project'.
- Use the provided URLs for the PDF assets.
- Ensure the header is "The Agentic Adventures 📂".

A2UI JSON Template Example:
{COMIC_CARDS_EXAMPLE}
"""

    if format_type.lower() == "creative":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants a UNIQUE, HIGH-FIDELITY visual experience that doesn't fit existing templates.

## Portfolio Data
{portfolio_data}

## FOCUS TOPIC: {topic}

## Your Task
You are in **CREATIVE MODE**. You must construct a novel rich UI experience from scratch using the following base components:
- `Column`: For vertical layout
- `Row`: For horizontal grids
- `Text`: For headings (usageHint: h1, h2, h3) and bodies
- `Image`: For visuals (url, alt)
- `PortfolioCard`: For interactive items (title, description, image, url, type)
- `ProfileBubble`: For a premium avatar (image, size)

**Instructions**:
1. Design a layout that perfectly answers the user's specific request for a "{topic}". 
2. Use a mix of Rows and Columns to create a "Dashboard" or "Matrix" feel.
3. Keep it premium, executive, and high-signal.
4. Output ONLY valid A2UI JSON.

A2UI JSON Template (Start here and build a custom structure):
[
  {{"beginRendering": {{"surfaceId": "{SURFACE_ID}", "root": "creativeRoot"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "{SURFACE_ID}",
      "components": [
        {{
          "id": "creativeRoot",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["headerRow", "contentGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }}
        // BUILD THE REST DYNAMICALLY...
      ]
    }}
  }}
]
"""

    if format_type.lower() == "gallery":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see a visual gallery of Enrique's work, achievements, and events.

## Enrique's Gallery Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of PortfolioCards.
- Use type 'project' for these cards.
- Each card should feature a title and a descriptive caption from the data.
- Ensure you include high-signal visuals like the 'NBC Olympic Architecture' and 'Cloud Tech Impact Award'.

A2UI JSON Template Example:
{GALLERY_CARDS_EXAMPLE}
"""

    if format_type.lower() == "matrix":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see a strategic breakdown, framework, or "wow" innovative display.

## Strategic Matrix Data
{portfolio_data}

## Your Task
Return A2UI JSON using the 'StrategicMatrix' component.
- Map the MATRIX data from the profile to the component properties.
- Ensure the 'title' and all 'cells' are included.
- For each cell, include 'phase', 'role', 'highlights', 'impact', 'color', and a relevant Material Symbol name for 'logo'.

A2UI JSON Template Example:
{STRATEGIC_MATRIX_EXAMPLE}
"""

    if format_type.lower() == "charts" or format_type.lower() == "radar":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see a data visualization, chart, or skill radar to "wow" them.

## Enrique's Skill Data
{portfolio_data}

## Your Task
Return A2UI JSON using the 'SkillRadar' component.
- Map the SKILLS categories from the profile to 'subject' and assign a 'value' (0-100) based on his seniority.
- Focus on the main categories: AI/ML, Data, Cloud, Strategy, and Engineering.

A2UI JSON Template Example:
{SKILL_RADAR_EXAMPLE}
"""

    return f"""You are Enrique K Chan's Portfolio Agent.
Generate HIGH-FIDELITY A2UI JSON for {format_type} content.
Focus on demonstrating Enrique's 15+ years of experience and his 19x cloud certifications.

## Portfolio Data
{portfolio_data}

## Your Task
Synthesize UNIQUE, data-driven components. Do NOT just copy the example.
Ensure all component IDs are unique.

A2UI JSON Template:
{example}
"""
