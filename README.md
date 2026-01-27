# Portfolio Agent: The Future of Professional Branding with A2UI

This project is a high-fidelity demonstration of **Agentic AI** applied to professional portfolios. It goes beyond simple chatbots by leveraging the **A2UI (Agent-Driven User Interface)** protocol and **Gemini 2.5 Flash** to create a dynamic, interactive, and data-driven brand experience.

## 🎯 Objective
The primary objective of this project was to transform the traditional, static resume/portfolio into a **living brand agent**. 
- **Personalization**: Delivery of career data tailored to the specific context of the user's questions.
- **Interactivity**: Moving from "text-only" chat to high-fidelity UI components (flashcards, quizzes, timelines).
- **Executive Precision**: Proving that an AI agent can represent a professional with 15+ years of experience (Google, AWS, Accenture) with the correct tone, accuracy, and technical depth.

## 🚀 What Was Proven?
1. **A2UI Efficacy**: Proven that complex JSON-based UI protocols can be generated with zero latency by Gemini 2.5 Flash, allowing the agent to "render" its own interface based on intent.
2. **Deterministic Data Binding**: Successfully bound a large, unstructured dataset of career highlights (15 years of Cloud Strategy, MLOps, and GTM) to structured UI components.
3. **Intent-Driven Architecture**: Proven a dual-layer model:
    - **Conversational Layer**: Handles natural language, context, and intent detection.
    - **UI Synthesis Layer**: Generates specialized A2UI payloads for high-signal requests (e.g., "Analyze his fit for this role").
4. **Premium Aesthetics**: Demonstrated that an agentic interface can maintain a sophisticated, brand-consistent look (Dark Obsidian, Glassmorphism, Google Sans) that rivals professional agency-built sites.

## 🛠️ Technology Stack
### Core AI & Protocol
- **Gemini 2.5 Flash**: The engine for both conversational reasoning and A2UI JSON generation.
- **A2UI Protocol**: High-fidelity Agent-Driven UI standard for rendering rich components.
- **Vertex AI SDK**: Enterprise-grade access to Gemini models.

### Frontend (High-Fidelity)
- **Lit & TypeScript**: Lightweight web components for high-performance rendering.
- **Vite**: Modern build tool for sub-second hot module replacement.
- **Glassmorphism UI**: Custom CSS system featuring backdrop-blur, subtle gradients, and obsidian-inspired tones.

### Backend & Orchestration
- **Node.js (tsx)**: Conversational gateway and API server (Port 8082).
- **FastAPI (Python)**: The specialized Agent Engine and data repository (Port 8081).
- **Agent Development Kit (ADK)**: Framework for building and managing the agentic lifecycle.

## 📁 Project Structure
- `/src`: The high-fidelity frontend components (Experience cards, Flashcards, Quizzes).
- `/agent`: The "Brains" – Python scripts managing the 15+ year portfolio dataset and A2UI templates.
- `api-server.ts`: The orchestrator that manages the handoff between conversational chat and UI generation.

## ⚡ Quick Start
1. **Install Dependencies**: `npm install` and setup the Python `venv` in `/agent`.
2. **Start the Engine**: `npm run start:all`
3. **Access**: Open `http://localhost:5175` to interact with the Portfolio Agent.

---
**Created by Enrique K Chan**  
*Showcasing the intersection of Agentic AI, Cloud Architecture, and High-Fidelity UX.*
