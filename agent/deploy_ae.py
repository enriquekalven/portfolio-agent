#!/usr/bin/env python3
"""
Enrique K Chan Portfolio Agent - Deployment Script for Vertex AI Agent Engine

This script deploys the ADK agent to Vertex AI Agent Engine.
"""

import os
import sys
import argparse
import logging
import json
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(
        description="Deploy the Enrique K Chan Portfolio Agent to Agent Engine"
    )
    parser.add_argument(
        "--project",
        type=str,
        default=os.getenv("GOOGLE_CLOUD_PROJECT"),
        help="GCP project ID",
    )
    parser.add_argument(
        "--location",
        type=str,
        default=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
        help="GCP location (default: us-central1)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List deployed agents instead of deploying",
    )

    args = parser.parse_args()

    if not args.project:
        print("ERROR: --project flag or GOOGLE_CLOUD_PROJECT environment variable is required")
        sys.exit(1)

    # Import Vertex AI modules
    import vertexai
    from vertexai import agent_engines
    from google.adk.agents import Agent
    from vertexai.agent_engines import AdkApp

    # Initialize Vertex AI
    vertexai.init(
        project=args.project,
        location=args.location,
        staging_bucket=f"gs://{args.project}_cloudbuild",
    )

    if args.list:
        print(f"\nDeployed agents in {args.project} ({args.location}):")
        for engine in agent_engines.list():
            print(f"  - {engine.display_name}: {engine.resource_name}")
        return

    print(f"Deploying Portfolio Agent to Agent Engine...")
    print(f"  Project: {args.project}")
    print(f"  Location: {args.location}")
    print()

    # Import local data (we'll inject it into the instruction)
    from agent.portfolio_data import PROFILE, EXPERIENCE, PROJECTS, SKILLS, CERTIFICATIONS, _AWARDS, TESTIMONIALS
    
    portfolio_context = f"""
PROFILE: {json.dumps(PROFILE)}
EXPERIENCE: {json.dumps(EXPERIENCE)}
PROJECTS: {json.dumps(PROJECTS)}
SKILLS: {json.dumps(SKILLS)}
CERTIFICATIONS: {json.dumps(CERTIFICATIONS)}
AWARDS: {json.dumps(_AWARDS)}
TESTIMONIALS: {json.dumps(TESTIMONIALS)}
"""

    model_id = os.getenv("GENAI_MODEL", "gemini-1.5-flash")
    
    # Define the core ADK Agent
    # For Agent Engine, we pass a clear instruction set
    agent = Agent(
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

    # Wrap in AdkApp
    app = AdkApp(agent=agent, enable_tracing=True)

    # Deploy
    remote_app = agent_engines.create(
        agent_engine=app,
        display_name="Portfolio Agent",
        requirements=[
            "google-cloud-aiplatform[agent_engines,adk]",
            "google-genai>=1.0.0",
        ],
    )

    print(f"\n{'='*60}")
    print("DEPLOYMENT SUCCESSFUL!")
    print(f"{'='*60}")
    print(f"Resource Name: {remote_app.resource_name}")
    resource_id = remote_app.resource_name.split("/")[-1]
    print(f"Resource ID: {resource_id}")
    print(f"\nNext step: update your UI deployment with this Resource ID.")

if __name__ == "__main__":
    main()
