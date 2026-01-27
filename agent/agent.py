"""
Enrique K Chan Portfolio Agent (Personalized Learning Base)

An agent that generates A2UI JSON for interactive portfolio materials.
Re-implemented as a class for compatibility with the sample's server.py.
"""

import json
import logging
import os
import time
from typing import Any, Optional, AsyncGenerator

from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types

# Import portfolio data
try:
    from agent.portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _CERTIFICATIONS, AWARDS, _AWARDS, PUBLICATIONS, _BLOGS, _VIDEOS, TESTIMONIALS, _SPEAKING, _GALLERY
except ImportError:
    from portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _CERTIFICATIONS, AWARDS, _AWARDS, PUBLICATIONS, _BLOGS, _VIDEOS, TESTIMONIALS, _SPEAKING, _GALLERY

# Import A2UI templates
try:
    from agent.a2ui_templates import get_system_prompt, SURFACE_ID
except ImportError:
    from a2ui_templates import get_system_prompt, SURFACE_ID

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LearningMaterialAgent:
    """Agent for generating personalized portfolio materials."""
    
    SUPPORTED_FORMATS = [
        "flashcards", "quiz", "podcast", "video", "image", "timeline", 
        "video_cards", "blog_cards", "awards", "certs", "speaker", "testimonials", "gallery"
    ]
    
    def __init__(self, model_id: str = "gemini-2.5-flash"):
        self.model_id = model_id
        # Client will be initialized on first use if needed for simple calls
        self.client = None
        
    def _get_client(self):
        if self.client is None:
            # Use Vertex AI if configured, else default to Gemini API
            use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "TRUE").upper() == "TRUE"
            project = os.getenv("GOOGLE_CLOUD_PROJECT")
            location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
            
            if use_vertex and project:
                self.client = genai.Client(vertexai=True, project=project, location=location)
            else:
                self.client = genai.Client()
        return self.client

    def _get_combined_context(self, context_topic: str = "") -> str:
        """Combine all portfolio data into a single context string."""
        context = f"""
PROFILE: {PROFILE}
EXPERIENCE: {EXPERIENCE}
PROJECTS: {PROJECTS}
SKILLS: {SKILLS}
CERTIFICATIONS: {CERTIFICATIONS}
RAW_CERTIFICATIONS: {_CERTIFICATIONS}
AWARDS: {AWARDS}
RAW_AWARDS: {_AWARDS}
PUBLICATIONS: {PUBLICATIONS}
BLOGS: {_BLOGS}
VIDEOS: {_VIDEOS}
SPEAKING: {_SPEAKING}
TESTIMONIALS: {TESTIMONIALS}

CURRENT_TIMESTAMP: {time.time()}
"""
        if context_topic:
            context += f"\n\nFOCUS TOPIC: {context_topic}"
        return context

    async def generate_content(self, format_type: str, context_topic: str = "") -> dict[str, Any]:
        """Generate A2UI content for the specified format."""
        logger.info(f"Generating {format_type} for topic: {context_topic}")
        
        if format_type not in self.SUPPORTED_FORMATS:
            return {"error": f"Unsupported format: {format_type}"}
            
        full_context = self._get_combined_context(context_topic)
        system_prompt = get_system_prompt(format_type, full_context, context_topic)
        
        client = self._get_client()
        
        is_json_format = format_type in [
            "flashcards", "quiz", "image", "video", "timeline", 
            "video_cards", "blog_cards", "awards", "certs", "speaker", "testimonials", "gallery"
        ]
        
        # Simple non-streaming call for the tool-like behavior
        response = client.models.generate_content(
            model=self.model_id,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text="Generate")])],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json" if is_json_format else "text/plain"
            )
        )

        
        try:
            text = response.text
            # Handle possible markdown wrapping
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            
            # Determine source attribution
            source = {"provider": "Enrique K Chan", "url": PROFILE.get("links", {}).get("portfolio")}
            
            if format_type == "video_cards":
                source = {"provider": "YouTube", "url": PROFILE.get("links", {}).get("youtube"), "title": "@enriquekchan"}
            elif format_type == "blog_cards":
                source = {"provider": "Medium", "url": PROFILE.get("links", {}).get("medium"), "title": "Insight Stream"}
            elif format_type == "certs":
                source = {"provider": "Credly / Google", "url": "https://www.credential.net/profile/enriquekchan", "title": "Cloud Certifications"}
            elif format_type == "speaker":
                source = {"provider": "Google Cloud Next", "url": "https://cloud.withgoogle.com/next", "title": "Speaking Engagements"}
            elif format_type == "awards":
                source = {"provider": "LinkedIn", "url": "https://www.linkedin.com/in/enriquechan/details/honors/", "title": "Trophy Room"}
            elif format_type == "timeline":
                source = {"provider": "Portfolio", "url": PROFILE.get("links", {}).get("portfolio"), "title": "Career History"}

            a2ui_json = json.loads(text)
            return {
                "format": format_type,
                "a2ui": a2ui_json,
                "surfaceId": SURFACE_ID,
                "source": source
            }
        except Exception as e:
            logger.error(f"Failed to parse A2UI JSON: {e}")
            return {"error": "Failed to generate UI components", "raw": response.text}

    async def stream(self, message: str, session_id: str = "default") -> AsyncGenerator[dict[str, Any], None]:
        """
        A2A-compatible streaming interface.
        If message is "format:topic", it generates that format.
        """
        parts = message.split(":", 1)
        format_type = parts[0].strip().lower()
        context = parts[1].strip() if len(parts) > 1 else ""
        
        if "advent of agents" in message.lower():
            response_text = "Enrique played a key role developing [adventofagents.com](https://adventofagents.com) and served as the primary content moderator for the campaign."
            yield {"text": response_text}
            return

        # Handle specific portfolio intents if they appear in the message
        # This is for requests coming from the frontend orchestrator
        message_lower = message.lower()
        if "award" in message_lower or "honor" in message_lower:
            format_type = "awards"
        elif "cert" in message_lower or "credential" in message_lower:
            format_type = "certs"
        elif "speak" in message_lower or "keynote" in message_lower:
            format_type = "speaker"
        elif "testimonial" in message_lower or "what people say" in message_lower:
            format_type = "testimonials"

        if format_type in self.SUPPORTED_FORMATS:
            result = await self.generate_content(format_type, context)
            yield result
        else:
            # General chat fallback
            full_context = self._get_combined_context(context)
            client = self._get_client()
            
            instruction = f"You are Enrique K Chan's Portfolio Agent. {full_context}"
            
            response = client.models.generate_content(
                model=self.model_id,
                contents=[types.Content(role="user", parts=[types.Part.from_text(text=message)])],
                config=types.GenerateContentConfig(
                    system_instruction=instruction,
                )
            )
            yield {"text": response.text}

# Singleton instance
_agent = None

def get_agent() -> LearningMaterialAgent:
    global _agent
    if _agent is None:
        _agent = LearningMaterialAgent(model_id=os.getenv("GENAI_MODEL", "gemini-3-flash"))
    return _agent
