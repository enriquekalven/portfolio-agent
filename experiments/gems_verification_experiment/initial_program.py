import json

GEM_PROMPT_MAP = {
    "gem-historian": {"prompt": "Show me Enrique's career highlights as a sequential timeline", "expected_format": "timeline"},
    "gem-matcher": {"prompt": "How do Enrique's skills match a Senior AI role?", "expected_format": "flashcards"},
    "gem-analyzer": {"prompt": "Analyze Enrique's fit for an AI Lead role", "expected_format": "flashcards"},
    "gem-media": {"prompt": "Show me his top YouTube videos", "expected_format": "video_cards"},
    "gem-blogs": {"prompt": "Show me some of his Medium blog posts", "expected_format": "blog_cards"},
    "gem-awards": {"prompt": "List Enrique's major awards and hackathon wins", "expected_format": "awards"},
    "gem-certs": {"prompt": "Show Enrique's cloud certifications", "expected_format": "certs"},
    "gem-speaker": {"prompt": "Show Enrique's speaking engagements and keynotes", "expected_format": "speaker"},
    "gem-testimonials": {"prompt": "Show me what people think of Enrique (testimonials)", "expected_format": "testimonials"},
    "gem-gallery": {"prompt": "Show me a gallery of your work and highlights", "expected_format": "gallery"},
    "gem-repos": {"prompt": "Show me your featured open source repositories", "expected_format": "general"}
}

def verify_gems_routing(gem_id: str) -> dict:
    """
    Verifies that a Gem ID maps to a valid prompt and expected A2UI format.
    """
    # EVOLVE-BLOCK-START
    if gem_id not in GEM_PROMPT_MAP:
        return {"valid": False, "error": f"Unknown Gem ID: {gem_id}"}
        
    gem_info = GEM_PROMPT_MAP[gem_id]
    prompt = gem_info["prompt"]
    expected_fmt = gem_info["expected_format"]
    
    # Keyword & format matching logic
    msg_lower = prompt.lower()
    detected_format = "general"
    
    if "timeline" in msg_lower or "career" in msg_lower:
        detected_format = "timeline"
    elif "skill" in msg_lower or "fit" in msg_lower or "match" in msg_lower:
        detected_format = "flashcards"
    elif "video" in msg_lower or "youtube" in msg_lower:
        detected_format = "video_cards"
    elif "blog" in msg_lower or "medium" in msg_lower:
        detected_format = "blog_cards"
    elif "award" in msg_lower or "trophy" in msg_lower or "hackathon" in msg_lower:
        detected_format = "awards"
    elif "cert" in msg_lower or "credential" in msg_lower:
        detected_format = "certs"
    elif "speak" in msg_lower or "keynote" in msg_lower:
        detected_format = "speaker"
    elif "testimonial" in msg_lower or "think of" in msg_lower or "vibes" in msg_lower:
        detected_format = "testimonials"
    elif "gallery" in msg_lower or "hall of mastery" in msg_lower:
        detected_format = "gallery"
    elif "repo" in msg_lower or "open source" in msg_lower:
        detected_format = "general"

    return {
        "valid": detected_format == expected_fmt,
        "gem_id": gem_id,
        "prompt": prompt,
        "expected": expected_fmt,
        "detected": detected_format
    }
    # EVOLVE-BLOCK-END
