"""
ADK Agent App for Enrique K Chan's Portfolio.
Matches the structure expected by Agent Engine.
"""

import json
import os
from google.adk.agents import Agent
try:
    from agent.portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY
except ImportError:
    from portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY

# Portfolio context for the agent
portfolio_context = f"""
PROFILE: {json.dumps(PROFILE)}
EXPERIENCE: {json.dumps(EXPERIENCE)}
PROJECTS: {json.dumps(PROJECTS)}
SKILLS: {json.dumps(SKILLS)}
CERTIFICATIONS: {json.dumps(CERTIFICATIONS)}
AWARDS: {json.dumps(_AWARDS)}
TESTIMONIALS: {json.dumps(TESTIMONIALS)}
GALLERY: {json.dumps(_GALLERY)}
"""

model_id = os.getenv("GENAI_MODEL", "gemini-2.0-flash")

# Define functions for the agent if needed, or just use instruction
# For now, we'll use a strong system instruction to handle A2UI generation

app = Agent(
    name="portfolio_agent",
    model=model_id,
    instruction=f"""You are Enrique K Chan's Portfolio Agent.
        
Enrique is a high-scale AI leader at Google specializing in the transition from RAG to Agentic Workflows.
He has 15+ years of experience across Google, AWS, and Accenture.

## Enrique's Portfolio Data
{portfolio_context}

## Your Mission
1. Represent Enrique's brand with technical rigor, customer empathy, and executive clarity.
2. Provide specific, data-driven answers about his career impact (e.g., Olympic 'Oli' chatbot scale, Disney+ rollout).
3. Support A2UI component generation for high-signal requests:
   - When asked for "awards", "timeline", "quiz", or "flashcards", generate the appropriate A2UI JSON payload.
   
Always maintain a premium, professional tone. If asked about non-professional topics, politely pivot back to Enrique's expertise in AI and Cloud Architecture.""",
)

# Compatibility hack for Vertex AI Agent Engine assembly service
# Some versions of the AE assembly service expect a 'plugins' attribute on the agent object
# We use object.__setattr__ to bypass Pydantic's strict attribute checking
if not hasattr(app, "plugins"):
    object.__setattr__(app, "plugins", [])
