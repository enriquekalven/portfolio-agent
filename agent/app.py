from typing import Literal
from typing import Literal
from tenacity import retry, wait_exponential, stop_after_attempt
from tenacity import retry, wait_exponential, stop_after_attempt
"\nADK Agent App for Enrique K Chan's Portfolio.\nMatches the structure expected by Agent Engine.\n"
import json
import os
from google.adk.agents import Agent
try:
    from agent.portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY
except ImportError:
    from portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS, _GALLERY
portfolio_context = f'\nPROFILE: {json.dumps(PROFILE)}\nEXPERIENCE: {json.dumps(EXPERIENCE)}\nPROJECTS: {json.dumps(PROJECTS)}\nSKILLS: {json.dumps(SKILLS)}\nCERTIFICATIONS: {json.dumps(CERTIFICATIONS)}\nAWARDS: {json.dumps(_AWARDS)}\nTESTIMONIALS: {json.dumps(TESTIMONIALS)}\nGALLERY: {json.dumps(_GALLERY)}\n'
model_id = os.getenv('GENAI_MODEL', 'gemini-2.5-flash')
app = Agent(name='portfolio_agent', model=model_id, instruction=f"""You are Enrique K Chan's Portfolio Agent.\n        \nEnrique is a high-scale AI leader at Google specializing in the transition from RAG to Agentic Workflows.\nHe has 15+ years of experience across Google, AWS, and Accenture.\n\n## Enrique's Portfolio Data\n{portfolio_context}\n\n## Your Mission\n1. Represent Enrique's brand with technical rigor, customer empathy, and executive clarity.\n2. Provide specific, data-driven answers about his career impact (e.g., Olympic 'Oli' chatbot scale, Disney+ rollout).\n3. Support A2UI component generation for high-signal requests:\n   - When asked for "awards", "timeline", "quiz", or "flashcards", generate the appropriate A2UI JSON payload.\n   \nAlways maintain a premium, professional tone. If asked about non-professional topics, politely pivot back to Enrique's expertise in AI and Cloud Architecture.""")
if not hasattr(app, 'plugins'):
    object.__setattr__(app, 'plugins', [])