import json
import os

def load_data():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(current_dir, 'portfolio_data.json')
    try:
        with open(json_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback for local testing if needed
        return {}

DATA = load_data()

# Export specific fields for compatibility with existing imports
PROFILE = DATA.get('PROFILE', {})
EXPERIENCE = DATA.get('EXPERIENCE', [])
PROJECTS = DATA.get("PROJECTS", [])
SKILLS = DATA.get("SKILLS", [])
CERTIFICATIONS = DATA.get("CERTIFICATIONS", [])
_AWARDS = DATA.get("AWARDS", [])
TESTIMONIALS = DATA.get("TESTIMONIALS", [])
PUBLICATIONS = DATA.get("PUBLICATIONS", [])
_GALLERY = DATA.get("GALLERY", [])
MATRIX = DATA.get("MATRIX", {})
COMICS = DATA.get("COMICS", [])
BLOGS = DATA.get("BLOGS", [])
VIDEOS = DATA.get("VIDEOS", [])

# Legacy Aliases for Agent Compatibility
_CERTIFICATIONS = CERTIFICATIONS
AWARDS = _AWARDS
_BLOGS = BLOGS
_VIDEOS = VIDEOS
_SPEAKING = [] # Placeholder
REPOSITORIES = PROJECTS # Alias for tests