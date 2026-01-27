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
          "component": {{"Text": {{"text": {{"literalString": "Sequential Career Timeline"}}, "usageHint": "h2"}}}}
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
            "component": {{"Text": {{"text": {{"literalString": "Watch My AI Sessions"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "videoGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["v1", "v2"]}},
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
              "title": "Rise of Agentic AI",
              "description": "Enrique's keynote on the transition to autonomous AI agents.",
              "image": "https://img.youtube.com/vi/nZa5-WyN-rE/maxresdefault.jpg",
              "url": "https://www.youtube.com/watch?v=nZa5-WyN-rE"
            }}
          }}
        }},
        {{
          "id": "v2",
          "component": {{
            "PortfolioCard": {{
              "type": "video",
              "title": "A2UI & Agentic Interfaces",
              "description": "A deep dive into high-fidelity Agentic User Interfaces.",
              "image": "https://img.youtube.com/vi/ZMIAlxx-Jx4/maxresdefault.jpg",
              "url": "https://www.youtube.com/watch?v=ZMIAlxx-Jx4"
            }}
          }}
        }}
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
              "children": {{"explicitList": ["header", "blogGrid"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "header",
          "component": {{"Text": {{"text": {{"literalString": "In Enrique's Stream: Medium"}}, "usageHint": "h2"}}}}
        }},
        {{
          "id": "blogGrid",
          "component": {{
            "Row": {{
              "children": {{"explicitList": ["b1", "b2", "b3"]}},
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
              "title": "Building Agentic Interfaces",
              "description": "Introducing the Agent UI Starter Pack and the philosophy behind agentic design.",
              "image": "/assets/blog-a2ui.png",
              "url": "https://medium.com/@enriq/building-the-future-of-agentic-interfaces-introducing-the-agent-ui-starter-pack-94d8fed86ca7"
            }}
          }}
        }},
        {{
          "id": "b2",
          "component": {{
            "PortfolioCard": {{
              "type": "blog",
              "title": "Introducing the Agent Optimizer",
              "description": "Optimizing agent performance for enterprise-scale workflows.",
              "image": "/assets/blog-optimizer.png",
              "url": "https://medium.com/@enriq/introducing-the-agent-optimizer-for-google-adk-3872856e6d7b"
            }}
          }}
        }},
        {{
          "id": "b3",
          "component": {{
            "PortfolioCard": {{
              "type": "blog",
              "title": "The Rise of Agentic AI",
              "description": "How AI agents are moving from conversation to autonomous action.",
              "image": "/assets/blog-rise.png",
              "url": "https://medium.com/@enriq"
            }}
          }}
        }}
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
            "component": {{"Text": {{"text": {{"literalString": "Key Industry Awards"}}, "usageHint": "h2"}}}}
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
              "title": "GTM Cloud Tech Impact Award",
              "description": "Recognized for the massive scale impact of the Olympic 'Oli' chatbot.",
              "image": "/assets/award_gtm_2024.jpg",
              "url": "https://www.google.com/search?q=nbc+olympics+oli+ai"
            }}
          }}
        }},
        {{
          "id": "a2",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": "AIS Offsite Hackathon Winner",
              "description": "Won 1st place for the 'Cards Against Humanity Agent' at the 2025 Google AIS Offsite.",
              "image": "/assets/awards.png",
              "url": "https://www.linkedin.com/feed/update/urn:li:activity:7265882565578702848/"
            }}
          }}
        }}
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
            "component": {{"Text": {{"text": {{"literalString": "Professional Certifications"}}, "usageHint": "h2"}}}}
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
              "title": "Google Cloud Professional ML Engineer",
              "description": "10x Google Cloud Certified, specializing in enterprise ML and AI architecture.",
              "image": "/assets/certs.png",
              "url": "https://www.credential.net/profile/enriquekchan"
            }}
          }}
        }},
        {{
          "id": "c2",
          "component": {{
            "PortfolioCard": {{
              "type": "project",
              "title": "AWS Solutions Architect Professional",
              "description": "7x AWS Certified with deep expertise in high-scale cloud systems.",
              "image": "/assets/certs.png",
              "url": "https://www.credly.com/users/enrique-chan"
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
            "component": {{"Text": {{"text": {{"literalString": "Global Speaking Engagements"}}, "usageHint": "h2"}}}}
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
            "component": {{"Text": {{"text": {{"literalString": "What People Say About Enrique"}}, "usageHint": "h2"}}}}
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
Represent Enrique's Medium blogs as a nice grid of cards.

## Enrique's Blog Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of Cards.
- Each Card should have an 'onAction' link to the medium URL.
- Use 'Image', 'Text' (h3) for title, and 'Text' (body) for description within the card.

A2UI JSON Template Example:
{example}
"""

    if format_type.lower() == "video_cards":
        return f"""You are Enrique K Chan's Portfolio Agent.
Represent Enrique's YouTube videos as high-quality cards.

## Enrique's Video Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of PortfolioCards.
- Use type 'video' for these cards.
- Provide a clear title and description.

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
The user wants to see Enrique's major awards and recognitions.

## Enrique's Award Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of PortfolioCards.
- Use type 'project' for these cards.
- **MANDATORY**: For the 'Cloud Tech Impact Award 2024', use the image '/assets/award_gtm_2024.jpg'. This is the high-fidelity trophy photo from Enrique's website.
- For other awards, use '/assets/awards.png'.
- Descriptions should highlight the massive scale and business impact (e.g., 'NBCU Olympic Chatbot serving 40M viewers').

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
        
        if "fit" in portfolio_data.lower() or "analyzer" in portfolio_data.lower():
            task_instruction = "FOCUS: Fit Analyzer. Create 3-4 cards comparing Enrique's specific experience (Google Cloud, AWS, Scale) to typical Senior AI/Product Lead requirements. Focus on why he's the right choice for high-stakes AI."
        elif "skill" in portfolio_data.lower() or "match" in portfolio_data.lower():
            task_instruction = "FOCUS: Skill Matcher. Create 3-4 cards illustrating how his deep skills (MLOps, Vertex AI, Agent Governance) apply to specific enterprise problems. Focus on technical depth and impact."
        elif "timeline" in portfolio_data.lower() or "historian" in portfolio_data.lower() or "career" in portfolio_data.lower():
            task_instruction = "FOCUS: Career Historian. Create 3-4 cards showing the narrative progression from Disney's MagicBands to AWS to Google Cloud's Agentic AI transition."

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
The user wants to see a picture or visual achievement.

## Portfolio Data
{portfolio_data}

## Your Task
Return A2UI JSON containing an 'Image' component.
- If they ask for his profile pic, use "/assets/hero.png".
- If they ask for the Olympics project architecture, use "/assets/architecture.jpg".

A2UI JSON Template:
{IMAGE_EXAMPLE}
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
Create a quiz about Enrique's background.

{portfolio_data}

A2UI JSON Template:
{QUIZ_EXAMPLE}
"""

    if format_type.lower() == "flashcards":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see interactive cards about Enrique's background.
FOCUS TOPIC: {topic}

## Portfolio Data
{portfolio_data}

## Your Task
Return A2UI JSON with a Row of 3-5 'Flashcard' components.
- **CRITICAL**: Synthesize UNIQUE cards based on the data. For example, if the topic is "AI Lead", focus on his Vertex AI, Agentic Workflows, and 2024 Olympics work.
- NEVER return empty strings for 'front' or 'back'.
- Do NOT repeat the example content exactly.
- Each card must have a unique ID (card1, card2, card3).
- The front: A question or "Skill Name".
- The back: A high-impact fact or achievement.
- Use categories like 'Deep Expertise', 'High Impact', or 'Professional Fit'.

A2UI JSON Template Example:
{FLASHCARD_EXAMPLE}
"""

    if format_type.lower() == "testimonials":
        return f"""You are Enrique K Chan's Portfolio Agent.
The user wants to see what high-level leaders and colleagues say about Enrique.

## Testimonial Data
{portfolio_data}

## Your Task
Return A2UI JSON using 'Flashcard' components in a Row.
- **CRITICAL**: Use the quantitative and qualitative quotes from Thomas Kurian, Michael Clark, and Brian Delahunty.
- The front: Name and Title of the person.
- The back: Their specific quote and the impact Enrique had.
- Use the category "Googler Feedback" or "Leadership Impact".

A2UI JSON Template Example:
{FLASHCARD_EXAMPLE}
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
