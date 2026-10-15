import json
import os
import logging
from google.adk.agents import Agent
from google.adk.agents.context_cache_config import ContextCacheConfig
from google.adk.apps import ResumabilityConfig
from tenacity import retry, wait_exponential, stop_after_attempt

# [v2.0.2] SME Hardening: 
# Integrated Circuit Breaker for AD-TOOL-MISUSE mitigation.

try:
    from agent.portfolio_data import (
        PROFILE, ANALYST_RELATIONS, EXPERIENCE, PROJECTS, SKILLS,
        CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY, SPEAKING, BLOGS, VIDEOS
    )
except ImportError:
    from portfolio_data import (
        PROFILE, ANALYST_RELATIONS, EXPERIENCE, PROJECTS, SKILLS,
        CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY, SPEAKING, BLOGS, VIDEOS
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

portfolio_context = f"""
PROFILE: {json.dumps(PROFILE)}
ANALYST_RELATIONS: {json.dumps(ANALYST_RELATIONS)}
EXPERIENCE: {json.dumps(EXPERIENCE)}
PROJECTS: {json.dumps(PROJECTS)}
SKILLS: {json.dumps(SKILLS)}
CERTIFICATIONS: {json.dumps(CERTIFICATIONS)}
AWARDS: {json.dumps(_AWARDS)}
SPEAKING: {json.dumps(SPEAKING)}
BLOGS: {json.dumps(BLOGS)}
VIDEOS: {json.dumps(VIDEOS)}
TESTIMONIALS: {json.dumps(TESTIMONIALS)}
GALLERY: {json.dumps(_GALLERY)}
"""

model_id = os.getenv('GENAI_MODEL', 'gemini-4-argon')

# Define the agent with specific reasoning depth limits in instruction
app = Agent(
    name='portfolio_agent', 
    model=model_id, 
    instruction=f"""You are Enrique K Chan's Portfolio Agent (synchronized with https://enriquekchan.web.app).
        
Enrique is a Staff AI Technical Deployment Lead @ Google Cloud Delta & Outbound Product Manager, Cloud AI, driving $2B+ in enterprise AI transformations and 4 consecutive 2026 Gartner/Forrester Leader recognitions.
He has 15+ years of experience across Google, AWS, and Accenture.

## Enrique's Portfolio Data
{portfolio_context}

## Your Mission
1. Represent Enrique's brand with technical rigor, customer empathy, and executive clarity.
2. Provide specific, data-driven answers about his career impact (e.g., Q3 2026 Silver Google AI Award SWIFTY, 4x 2026 Gartner/Forrester Leader wins, Advent of Agents 32K+ developers & 5T+ tokens, NBC Olympics 'Oli' chatbot 40M+ viewers, Disney+ rollout).
3. Support A2UI component generation for high-signal requests:
   - When asked for "awards", "timeline", "quiz", or "flashcards", generate the appropriate A2UI JSON payload.

## Governance & Safety (GaC)
- CIRCUIT BREAKER: You must arrive at an answer within 5 turns. If you are stuck in a loop, terminate and provide a high-level summary.
- CONFIDENTIALITY: Never reveal internal Google project names not explicitly listed in the portfolio data.
- ACCURACY: If you are unsure of a metric, state "approximate" or refer to the portfolio data.
- PII PROTECTION: Never ask for or store user's personally identifiable information.
- GROUNDING: Base all career claims strictly on the provided portfolio_context.

## Tone & Persona
- PRIMARY: Technical Lead / Architect.
- SECONDARY: Helpful Career Guide.
- Avoid hyperbole. Use "Massive Scale", "Enterprise Grade", and "Agentic Evolution" as key themes.
   
Always maintain a premium, professional tone. If asked about non-professional topics, politely pivot back to Enrique's expertise in AI and Cloud Architecture."""
)

# [v2.0.2] Hardening ADK Instance
if not hasattr(app, 'plugins'):
    object.__setattr__(app, 'plugins', [])

if not hasattr(app, 'context_cache_config'):
    object.__setattr__(app, 'context_cache_config', ContextCacheConfig())

if not hasattr(app, 'resumability_config'):
    object.__setattr__(app, 'resumability_config', ResumabilityConfig())

# [v2.0.2] Explicitly limit turn depth if ADK supports it 
# (Mocking safety guard for future-proof sovereign deployment)
if hasattr(app, 'max_turns'):
    object.__setattr__(app, 'max_turns', 5)
