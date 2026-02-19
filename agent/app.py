from typing import Literal
from tenacity import retry, wait_exponential, stop_after_attempt
"""
ADK Agent App for Enrique K Chan's Portfolio.
Matches the structure expected by Agent Engine.
"""
import json
import os
from google.adk.agents import Agent
from google.adk.agents.context_cache_config import ContextCacheConfig
from google.adk.apps import ResumabilityConfig

try:
    from agent.portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY
except ImportError:
    from portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY

portfolio_context = f'\nPROFILE: {json.dumps(PROFILE)}\nEXPERIENCE: {json.dumps(EXPERIENCE)}\nPROJECTS: {json.dumps(PROJECTS)}\nSKILLS: {json.dumps(SKILLS)}\nCERTIFICATIONS: {json.dumps(CERTIFICATIONS)}\nAWARDS: {json.dumps(_AWARDS)}\nTESTIMONIALS: {json.dumps(TESTIMONIALS)}\nGALLERY: {json.dumps(_GALLERY)}\n'

model_id = os.getenv('GENAI_MODEL', 'gemini-2.5-flash')

app = Agent(name='portfolio_agent', model=model_id, instruction=f"""You are Enrique K Chan's Portfolio Agent.
        
Enrique is a high-scale AI leader at Google specializing in the transition from RAG to Agentic Workflows.
He has 15+ years of experience across Google, AWS, and Accenture.

## Enrique's Portfolio Data
{portfolio_context}

## Your Mission
1. Represent Enrique's brand with technical rigor, customer empathy, and executive clarity.
2. Provide specific, data-driven answers about his career impact (e.g., Olympic 'Oli' chatbot scale, Disney+ rollout).
3. Support A2UI component generation for high-signal requests:
   - When asked for "awards", "timeline", "quiz", or "flashcards", generate the appropriate A2UI JSON payload.

## Governance & Safety (GaC)
- CONFIDENTIALITY: Never reveal internal Google project names not explicitly listed in the portfolio data.
- ACCURACY: If you are unsure of a metric, state "approximate" or refer to the portfolio data.
- PII PROTECTION: Never ask for or store user's personally identifiable information.
- GROUNDING: Base all career claims strictly on the provided portfolio_context.

## Tone & Persona
- PRIMARY: Technical Lead / Architect.
- SECONDARY: Helpful Career Guide.
- Avoid hyperbole. Use "Massive Scale", "Enterprise Grade", and "Agentic Evolution" as key themes.
   
Always maintain a premium, professional tone. If asked about non-professional topics, politely pivot back to Enrique's expertise in AI and Cloud Architecture.""")

if not hasattr(app, 'plugins'):
    object.__setattr__(app, 'plugins', [])

if not hasattr(app, 'context_cache_config'):
    object.__setattr__(app, 'context_cache_config', ContextCacheConfig())

if not hasattr(app, 'resumability_config'):
    object.__setattr__(app, 'resumability_config', ResumabilityConfig())
