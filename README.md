# Enrique K Chan: The Portfolio Agent 🤖✨

A high-fidelity demonstration of **Agentic AI** applied to professional branding. This project transcends static portfolios by leveraging the **A2UI (Agent-Driven User Interface)** protocol and **Gemini 2.x** to create a living, interactive career ambassador.

[![Visit Enrique's Site](https://img.shields.io/badge/Live-Portfolio-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](https://enriquekchan.web.app/#about)
[![View on GitHub](https://img.shields.io/badge/GitHub-Source-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/enriquekalven/portfolio-agent)

## 🏗️ System Architecture
```mermaid
graph TD
    User((User)) -->|Natural Language| FE[Frontend: Vite/TS/Custom Elements]
    FE -->|Processing| CO[Chat Orchestrator]
    CO -->|Detect Intent| CL[A2A Client: Hybrid Bridge]
    
    subgraph "Agent Engine (Remote)"
        AE[Vertex AI Agent Engine]
        AE -->|Reasoning| GEM[Gemini 2.x]
        AE -->|Data Source| DB[(portfolio_data.py)]
    end
    
    subgraph "UI Synthesis Layer (Hybrid)"
        CL -->|Remote Call| AE
        CL -->|High-Fidelity Fallback| FB[A2UI Local Synthesis]
    end
    
    AE -->|A2UI JSON| CL
    FB -->|A2UI JSON| CL
    CL -->|Render| RN[A2UI Renderer]
    RN -->|Inject Components| FE
```

## 🎯 The Vision
Modern portfolios should be as dynamic as the careers they represent. This "Portfolio Agent" is designed to:
- **Tailor the Narrative**: Dynamically synthesize Enrique's 15+ years of experience (Google, AWS, Disney) based on the user's specific interests.
- **Render Intent**: Use the **A2UI Protocol** to automatically generate high-fidelity UI components (Timelines, Trophies, Quizzes) that match the conversational context.
- **Establish Presence**: Provide a premium, "Gemini-inspired" experience that feels like chatting with an executive assistant.

## ✨ The "Gems" (Interactive Capabilities)
The agent features specialized modules (or "Gems") that provide deep-dives into Enrique's history:

- **📜 Career Historian**: A sequential journey through high-scale engineering and strategy.
- **🎯 Skill Matcher**: Instant analysis of how Enrique's expertise applies to specific roles or problems.
- **📊 Fit Analyzer**: A data-driven comparison of career highlights against enterprise requirements.
- **🎬 Cinema Hub**: Interactive access to keynote sessions and AI thought leadership videos.
- **✍️ Insight Stream**: A curated feed of premium Medium articles on AI architecture and governance.
- **🏆 Trophy Room**: A visual showcase of Google GTM awards and high-stakes hackathon wins.
- **☁️ Cloud Badge Wall**: A full-fidelity rendering of 19x professional certifications (GCP, AWS, Azure).
- **🎤 Stage Presence**: Highlights from global speaking engagements and developer summits.
- **✨ Googler Vibes**: Real-world testimonials and peer feedback from Google leadership.
- **🖼️ Hall of Mastery**: A premium visual gallery featuring architectural diagrams and career milestones.

## 🛠️ Advanced Features
- **🎙️ Voice-to-UI**: Integrated Web Speech API for seamless voice-driven exploration.
- **🧠 Session Memory**: Persistent "Recent Chats" sidebar that tracks your exploration history in real-time.
- **🔄 Hybrid Logic**: A dual-layered architecture featuring a remote Agent Engine backend with sub-second client-side A2UI fallbacks.
- **💎 Premium Design**: Custom CSS system featuring Glassmorphism, Backdrop filters, and Obsidian-inspired dark modes.

## 🧰 Technology Stack
- **AI Core**: Gemini 2.x (Flash/Pro) & Google ADK (Agent Development Kit).
- **Protocol**: A2UI (Agent-Driven User Interface) for deterministic UI synthesis.
- **Frontend**: Vite + TypeScript + Custom Web Components (no heavy frameworks).
- **Backend**: Python (FastAPI/Agent Engine) + Node.js (Orchestration).
- **Cloud**: Deployed on Google Cloud Run, Vertex AI, and Firebase.

## 📁 Project Structure
- `/src`: High-fidelity UI components and the `ChatOrchestrator` logic.
- `/agent`: The "Brains" – Python-based data repository and A2UI synthesis templates.
- `A2AClient.ts**: The bridge managing remote agent calls and high-fidelity fallback states.

---
**Crafted with ❤️ by [Enrique K Chan](https://www.linkedin.com/in/enriquechan/)**  
*Building the future of Agentic Interfaces.*
