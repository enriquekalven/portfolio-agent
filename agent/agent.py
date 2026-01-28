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
    from agent.portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _CERTIFICATIONS, AWARDS, _AWARDS, PUBLICATIONS, _BLOGS, _VIDEOS, TESTIMONIALS, _SPEAKING, _GALLERY, COMICS
except ImportError:
    from portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _CERTIFICATIONS, AWARDS, _AWARDS, PUBLICATIONS, _BLOGS, _VIDEOS, TESTIMONIALS, _SPEAKING, _GALLERY, COMICS

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
        "video_cards", "blog_cards", "awards", "certs", "speaker", "testimonials", "gallery", "creative", "comics"
    ]
    
    def __init__(self, model_id: str = "gemini-1.5-flash"):
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
COMICS: {COMICS}

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
            "video_cards", "blog_cards", "awards", "certs", "speaker", "testimonials", "gallery", "creative"
        ]
        
        # Context Caching Optimization (AgentOps Audit: High Impact)
        # Reduces redundant token processing for large static instructions
        cache_name = self._get_cache_name(system_prompt)
        
        config_args = {
            "response_mime_type": "application/json" if is_json_format else "text/plain"
        }
        
        # If cache created successfully, use it; otherwise fallback to system_instruction
        if cache_name:
            config_args["cached_content"] = cache_name
        else:
            config_args["system_instruction"] = system_prompt

        # Simple non-streaming call for the tool-like behavior
        # VARIETY FIX: Use a random seed/timestamp in the user message 
        # to prevent cached-result repetition for generic "Generate" requests.
        user_message = f"Generate {format_type} for topic: {context_topic}. [Random Seed: {time.time()}]"

        response = client.models.generate_content(
            model=self.model_id,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=user_message)])],
            config=types.GenerateContentConfig(**config_args)
        )

    def _get_cache_name(self, system_instruction: str) -> Optional[str]:
        """Get or create a context cache for the given instruction."""
        # Minimum token requirement for caching is often ~32k, but Vertex/GenAI SDK
        # handles the logic. We implement it to follow audit best practices.
        client = self._get_client()
        
        if not hasattr(self, '_cache_map'):
            self._cache_map = {}
            
        inst_hash = hash(system_instruction)
        if inst_hash in self._cache_map:
            return self._cache_map[inst_hash]
            
        try:
            # Context caching provides a 90% cost reduction on reuse
            logger.info("Initializing Context Cache for high-signal system prompt...")
            
            # Caching often requires specific model versions (e.g. -001)
            model_name = self.model_id
            if 'flash' in model_name and '001' not in model_name and '002' not in model_name:
                model_name = 'gemini-1.5-flash-001'

            cached_content = client.caches.create(
                model=model_name,
                config=types.CachedContentConfig(
                    system_instruction=system_instruction,
                    ttl='3600s',
                )
            )
            self._cache_map[inst_hash] = cached_content.name
            logger.info(f"Context Cache active: {cached_content.name}")
            return cached_content.name
        except Exception as e:
            # Fallback gracefully if caching is not supported for this model/size
            logger.debug(f"Context caching skipped: {e}")
            return None

        
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

        if format_type not in self.SUPPORTED_FORMATS:
            # Handle specific portfolio intents if they appear in the message
            # This is for requests coming from the frontend orchestrator or raw chat
            message_lower = message.lower()
            if "award" in message_lower or "honor" in message_lower or "trophy" in message_lower:
                format_type = "awards"
            elif "cert" in message_lower or "credential" in message_lower or "badge" in message_lower:
                format_type = "certs"
            elif "speak" in message_lower or "keynote" in message_lower:
                format_type = "speaker"
            elif "testimonial" in message_lower or "what people say" in message_lower:
                format_type = "testimonials"
            elif "blog" in message_lower or "article" in message_lower or "medium" in message_lower:
                format_type = "blog_cards"
            elif "video cards" in message_lower or "video gallery" in message_lower or "youtube gallery" in message_lower:
                format_type = "video_cards"
            elif "timeline" in message_lower or "career journey" in message_lower or "history" in message_lower:
                format_type = "timeline"
            elif "gallery" in message_lower or "portfolio sample" in message_lower:
                format_type = "gallery"
            elif "skill match" in message_lower or "analyze fit" in message_lower or "role fit" in message_lower:
                format_type = "flashcards"
            elif "comic" in message_lower or "secret file" in message_lower or "unlocked" in message_lower:
                format_type = "comics"

        if format_type in self.SUPPORTED_FORMATS:
            result = await self.generate_content(format_type, context)
            yield result
        else:
            # General chat fallback with Context Caching
            full_context = self._get_combined_context(context)
            client = self._get_client()
            
            instruction = f"You are Enrique K Chan's Portfolio Agent. {full_context}"
            
            cache_name = self._get_cache_name(instruction)
            config_args = {}
            if cache_name:
                config_args["cached_content"] = cache_name
            else:
                config_args["system_instruction"] = instruction

            response = client.models.generate_content(
                model=self.model_id,
                contents=[types.Content(role="user", parts=[types.Part.from_text(text=message)])],
                config=types.GenerateContentConfig(**config_args)
            )
            yield {"text": response.text}

# Singleton instance
_agent = None

def get_agent() -> LearningMaterialAgent:
    global _agent
    if _agent is None:
        _agent = LearningMaterialAgent(model_id=os.getenv("GENAI_MODEL", "gemini-1.5-flash"))
    return _agent
