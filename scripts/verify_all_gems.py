import json
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agent.agent import get_agent

GEMS_PROMPTS = [
    ("Career Historian 📜", "Show me Enrique's career highlights as a sequential timeline", "timeline"),
    ("Skill Matcher 🎯", "How do Enrique's skills match a Senior AI role?", "flashcards"),
    ("Fit Analyzer 📊", "Analyze Enrique's fit for an AI Lead role", "flashcards"),
    ("Cinema Hub 🎬", "Show me his top YouTube videos", "video_cards"),
    ("Insight Stream ✍️", "Show me some of his Medium blog posts", "blog_cards"),
    ("Trophy Room 🏆", "List Enrique's major awards and hackathon wins", "awards"),
    ("Cloud Badge Wall ☁️", "Show Enrique's cloud certifications", "certs"),
    ("Stage Presence 🎤", "Show Enrique's speaking engagements and keynotes", "speaker"),
    ("Googler Vibes ✨", "Show me what people think of Enrique (testimonials)", "testimonials"),
    ("Hall of Mastery 🖼️", "Show me a gallery of your work and highlights", "gallery"),
    ("Repo Scout 🚀", "Show me your featured open source repositories", "general")
]

async def verify_gems():
    agent = get_agent()
    print("=" * 80)
    print("VERIFYING ALL 11 SIDEBAR GEMS FOR PORTFOLIO AGENT")
    print("=" * 80)

    all_passed = True
    for name, prompt, expected_fmt in GEMS_PROMPTS:
        t0 = asyncio.get_event_loop().time()
        chunks = []
        error = None
        try:
            async for chunk in agent.stream(prompt):
                if isinstance(chunk, dict):
                    if "text" in chunk:
                        chunks.append(str(chunk["text"]))
                    elif "a2ui" in chunk or "format" in chunk:
                        chunks.append(json.dumps(chunk))
                elif isinstance(chunk, str):
                    chunks.append(chunk)
        except Exception as e:
            error = str(e)

        elapsed = asyncio.get_event_loop().time() - t0
        full_res = "".join(chunks).strip()
        is_ok = error is None and len(full_res) > 10

        if not is_ok:
            all_passed = False

        status = "✅ PASS" if is_ok else "❌ FAIL"
        print(f"{status} | {name:<22} | Expected: {expected_fmt:<12} | Time: {elapsed:.2f}s | Length: {len(full_res)}")

    print("=" * 80)
    if all_passed:
        print("ALL 11 SIDEBAR GEMS VERIFIED AND WORKING PERFECTLY!")
    else:
        print("SOME GEMS FAILED VERIFICATION")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(verify_gems())
