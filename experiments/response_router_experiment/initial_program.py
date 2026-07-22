import json

SUPPORTED_FORMATS = [
    'flashcards', 'quiz', 'podcast', 'video', 'image', 'timeline', 
    'video_cards', 'blog_cards', 'awards', 'certs', 'speaker', 
    'testimonials', 'gallery', 'creative', 'comics'
]

def route_and_enrich_intent(message: str) -> dict:
    """
    Response Router and Keyword Enricher for Portfolio Agent.
    Determines format type and extracts high-signal keywords from user message.
    """
    # EVOLVE-BLOCK-START
    msg_lower = message.lower()
    format_type = "general"
    
    keyword_map = {
        'award': 'awards', 'honor': 'awards', 'trophy': 'awards', 'hackathon': 'awards',
        'cert': 'certs', 'credential': 'certs', 'badge': 'certs',
        'speak': 'speaker', 'keynote': 'speaker', 'talk': 'speaker',
        'testimonial': 'testimonials', 'quote': 'testimonials', 'feedback': 'testimonials',
        'blog': 'blog_cards', 'article': 'blog_cards', 'medium': 'blog_cards',
        'video': 'video_cards', 'youtube': 'video_cards',
        'timeline': 'timeline', 'history': 'timeline', 'journey': 'timeline', 'career': 'timeline',
        'gallery': 'gallery', 'photo': 'gallery', 'picture': 'gallery',
        'skill': 'flashcards', 'fit': 'flashcards', 'match': 'flashcards',
        'comic': 'comics', 'secret': 'comics', 'adventure': 'comics'
    }
    
    for kw, fmt in keyword_map.items():
        if kw in msg_lower:
            format_type = fmt
            break
            
    # Extract domain keywords
    domain_terms = ["google", "aws", "accenture", "vertex ai", "olympics", "oli", "disney", "advent of agents", "cockpit"]
    found_keywords = [term for term in domain_terms if term in msg_lower]
    keywords_str = ", ".join(found_keywords) if found_keywords else message
    
    return {
        "format": format_type,
        "keywords": keywords_str,
        "is_content_generating": format_type in SUPPORTED_FORMATS
    }
    # EVOLVE-BLOCK-END
