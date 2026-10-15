"""
Structured Portfolio Data for Enrique Kalven Chan.
Loads from portfolio_data.json for single-source-of-truth maintenance
and 100% synchronization with https://enriquekchan.web.app.
"""
import json
import os
import logging

logger = logging.getLogger(__name__)

# Fallback defaults in case JSON is missing or corrupted
DEFAULT_DATA = {
    "PROFILE": {},
    "ANALYST_RELATIONS": [],
    "SERVICES": [],
    "EXPERIENCE": [],
    "PROJECTS": [],
    "AWARDS": [],
    "BLOGS": [],
    "VIDEOS": [],
    "SPEAKING": [],
    "CERTIFICATIONS": [],
    "CERTIFICATION_GROUPS": [],
    "TESTIMONIALS": [],
    "COMICS": [],
}

DATA_PATH = os.path.join(os.path.dirname(__file__), "portfolio_data.json")

try:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        DATA = json.load(f)
except Exception as e:
    logger.error(f"Failed to load portfolio_data.json from {DATA_PATH}: {e}")
    DATA = DEFAULT_DATA

PROFILE = DATA.get("PROFILE", {})
ANALYST_RELATIONS = DATA.get("ANALYST_RELATIONS", [])
SERVICES = DATA.get("SERVICES", [])
EXPERIENCE = DATA.get("EXPERIENCE", [])
PROJECTS = DATA.get("PROJECTS", [])
AWARDS = DATA.get("AWARDS", [])
BLOGS = DATA.get("BLOGS", [])
VIDEOS = DATA.get("VIDEOS", [])
SPEAKING = DATA.get("SPEAKING", [])
CERTIFICATIONS = DATA.get("CERTIFICATIONS", [])
CERTIFICATION_GROUPS = DATA.get("CERTIFICATION_GROUPS", [])
TESTIMONIALS = DATA.get("TESTIMONIALS", [])
COMICS = DATA.get("COMICS", [])
REPOSITORIES = DATA.get("REPOSITORIES", [])

# Backward-compatible aliases used across agent/agent.py and agent/app.py
SKILLS = PROFILE.get("top_skills", [])
_CERTIFICATIONS = CERTIFICATIONS
_AWARDS = AWARDS
PUBLICATIONS = BLOGS
_BLOGS = BLOGS
_VIDEOS = VIDEOS
_SPEAKING = SPEAKING
GALLERY = PROJECTS
_GALLERY = PROJECTS