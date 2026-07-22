import json
import os

queries = [
    # Category 1: Profile & Background (1-10)
    "Who is Enrique K Chan?",
    "What is Enrique's current role at Google Cloud?",
    "Where is Enrique based?",
    "What languages does Enrique speak?",
    "What is Enrique's summary of expertise?",
    "What companies has Enrique worked for over his career?",
    "What is Enrique's professional background?",
    "How many years of experience does Enrique have in AI and Cloud?",
    "Does Enrique have experience in Real Estate Investing?",
    "Can you share Enrique's social media links like LinkedIn and GitHub?",

    # Category 2: Google Cloud Experience & Roles (11-20)
    "Tell me about Enrique's role as Outbound Product Manager for Cloud AI.",
    "What did Enrique do as a Senior AI Consultant in PSO?",
    "What whitepaper did Enrique co-author at Google Cloud?",
    "How many attendees did the Intro to Agents whitepaper reach?",
    "What CoE is Enrique leading at Google?",
    "What is Enrique's focus regarding RAG and Agentic Workflows?",
    "What go-to-market initiatives has Enrique driven for Cloud AI?",
    "What impact did Enrique make as an Outbound PM?",
    "Did Enrique lead any partner enablement campaigns?",
    "What tools does Enrique use for agent governance at Google?",

    # Category 3: Flagship Projects (21-30)
    "Tell me about the NBC Olympic Concierge (Oli AI) project.",
    "How many viewers did the NBC Olympic Concierge serve?",
    "What latency and uptime were achieved for the Olympics chatbot?",
    "What is AgentOps Cockpit v2.0.2?",
    "Where can I find the AgentOps Cockpit PyPI package?",
    "Tell me about the Disney+ Global Scaling project.",
    "What was Enrique's role in Project Bozeman for Wayfair Agentspace?",
    "What did Enrique build for WBD Translation & Caption AI?",
    "What was the Advent of Agents holiday developer campaign?",
    "Where can I view the architecture diagram for Oli AI?",

    # Category 4: AWS & Accenture Experience (31-40)
    "What was Enrique's role at Amazon Web Services (AWS)?",
    "How long was Enrique at Accenture and what was his position?",
    "What distributed microservice tools did Enrique use at AWS?",
    "How much pre-sales pipeline did Enrique generate at Accenture?",
    "How much delivery work did Enrique sell at Accenture?",
    "Did Enrique perform AWS Well-Architected Framework reviews?",
    "What cloud modernization projects did Enrique lead at Accenture?",
    "How many direct reports did Enrique manage at Accenture?",
    "What AWS certifications does Enrique hold?",
    "Compare Enrique's impact at AWS vs Accenture.",

    # Category 5: Certifications & Credentials (41-50)
    "What Google Cloud certifications does Enrique hold?",
    "Is Enrique a Google Cloud Professional ML Engineer?",
    "Is Enrique a Professional Cloud Architect?",
    "What AWS certifications does Enrique possess?",
    "How many total cloud certifications does Enrique hold across GCP, AWS, and Azure?",
    "Show me Enrique's certification wall.",
    "Where can I verify Enrique's cloud credentials?",
    "Does Enrique have enterprise-grade MLOps certification?",
    "What skills are covered by Enrique's ML Engineer cert?",
    "Show me Enrique's Cloud Badge Wall.",

    # Category 6: Awards & Honors (51-60)
    "What awards has Enrique won at Google Cloud?",
    "What is the GTM Cloud Tech Impact Award 2024?",
    "Tell me about winning the 2025 Google AIS Offsite Hackathon.",
    "What agent did Enrique build for the AIS Offsite Hackathon?",
    "What is the Cloud GTM Excellence Award 2025?",
    "Show me the Trophy Room for Enrique's honors.",
    "Why was Enrique awarded the GTM Regional Award?",
    "What recognition did Enrique receive from Google Cloud NorthAm leadership?",
    "Where can I view Enrique's honors on LinkedIn?",
    "Summarize Enrique's top 3 career awards.",

    # Category 7: Testimonials & Leadership Quotes (61-70)
    "What did Thomas Kurian say about Enrique?",
    "What quote did Michael Clark give for Enrique's award?",
    "What did Brian Delahunty say about Enrique's agent whitepaper?",
    "What do Google Cloud Architects say about Enrique?",
    "Show me Googler testimonials for Enrique.",
    "Does Enrique lead with customer empathy?",
    "What is the executive feedback on Enrique's technical leadership?",
    "What do peers say about Enrique's work on agentic substrates?",
    "Summarize executive quotes about Enrique K Chan.",
    "Show me Googler Vibes and feedback.",

    # Category 8: Publications & Medium Blogs (71-80)
    "What articles has Enrique written on Medium?",
    "Tell me about 'How I Built a Living AI Portfolio in a few Hours'.",
    "What is 'Building the Future of Agentic Interfaces' about?",
    "Summarize 'The Architect's Guide to the BigQuery AI Agent Ecosystem'.",
    "What is 'From OpenAI to Gemini Enterprise: Automating Agent Migration' about?",
    "What is 'Introducing the Agent Optimizer' about?",
    "What is '3 Commands to Create, Deploy, and Register an ADK Agent'?",
    "Where can I find Enrique's Medium blog profile?",
    "How many technical articles has Enrique published?",
    "Show me Enrique's Insight Stream blog cards.",

    # Category 9: Keynotes, Speaking & Videos (81-90)
    "What sessions has Enrique presented at Google Cloud Next '25?",
    "Tell me about Enrique's talk 'Architecting GenAI Agents'.",
    "What was Enrique's role as Booth Lead for AI Agents at Cloud Next '25?",
    "What did Enrique present at the Google ADK Summit?",
    "Tell me about the YouTube video 'From Talking to Doing: The Rise of Agentic AI'.",
    "What is the video 'The Ultimate Guide to AI Agent Quality' about?",
    "What is the video 'Why 80% of AI Agents Fail' about?",
    "Tell me about the 'Advent of Agents Day 15 - A2UI' video.",
    "Where can I watch Enrique's keynote speeches?",
    "Show me Enrique's Cinema Hub video cards.",

    # Category 10: Skill Matcher, A2UI UI Formats & Comics (91-100)
    "Can you analyze Enrique's skill match for a Principal AI Product Manager role?",
    "Evaluate Enrique's fit for an Enterprise MLOps Architect position.",
    "Show me a visual timeline of Enrique's career journey.",
    "Generate a quiz about Enrique's professional achievements.",
    "Show me the Agentic Adventures comic series.",
    "What comics has Enrique authored?",
    "Show me Enrique's Hall of Mastery gallery.",
    "Can you render flashcards highlighting Enrique's AI/ML skills?",
    "Show me Enrique's top open source repositories on GitHub.",
    "Give me a complete overview of why Enrique is a top AI leader."
]

eval_cases = []
for i, q in enumerate(queries, 1):
    eval_cases.append({
        "eval_case_id": f"case_{i:03d}",
        "prompt": {
            "role": "user",
            "parts": [{"text": q}]
        }
    })

os.makedirs("tests/eval/datasets", exist_ok=True)
dataset = {"eval_cases": eval_cases}
with open("tests/eval/datasets/100_queries_dataset.json", "w") as f:
    json.dump(dataset, f, indent=2)

print(f"Generated 100 evaluation cases in tests/eval/datasets/100_queries_dataset.json")
