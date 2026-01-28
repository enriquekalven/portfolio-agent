# 🤖 Portfolio Agent: Documentation & Overview

This document provides a deep dive into the technical architecture, dataflow, and component ecosystem of the Enrique K Chan Portfolio Agent.

---

## 🔄 The Dataflow (E2E Journey)

The Portfolio Agent uses a **Hybrid Bridge** architecture to balance high-speed conversational responses with high-fidelity UI synthesis.

1.  **Interaction Layer**: A user enters natural language ("Show me your cloud certs") or interacts with a "Gem" button in the **Vite/TS Frontend**.
2.  **Orchestration**: `ChatOrchestrator.ts` captures the input and dispatches a POST request to the **Firebase Cloud Function (Bridge)**.
3.  **Intent & Text Synthesis (Fast Path)**: 
    *   The Bridge (`functions/index.js`) executes a **Single LLM call (Gemini 2.5 Flash)**.
    *   It returns a JSON object containing a conversational response *and* a detected intent (e.g., `intent: "certs"`, `keywords: "GCP, AWS"`).
4.  **A2UI UI Synthesis (Deep Path)**: 
    *   If a specific intent is detected, the `A2AClient.ts` triggers a call to the **Vertex AI Agent Engine**.
    *   The Python Agent retrieves the relevant data from `portfolio_data.py` and maps it to **A2UI JSON templates** (`a2ui_templates.py`).
5.  **Dynamic Rendering**:
    *   The UI receives the A2UI JSON payload. 
    *   The **A2UI Web Library** parses the instructions and injects native Web Components (Cards, Timelines, Badges) directly into the chat flow.

---

## 📂 Key Files & Directory Structure

### 🌐 Frontend (Vite + TypeScript)
-   `src/ChatOrchestrator.ts`: The "CPU" of the UI. Manages chat history, loading states, and side-panel synchronization.
-   `src/a2a-client.ts`: The networking layer. Manages the handoff between the conversational Bridge and the A2UI Agent Engine.
-   `a2ui-web-lib/`: A custom library for parsing the A2UI protocol and rendering complex UI trees.

### 🌉 Bridge Layer (Node.js)
-   `functions/index.js`: The production **Firebase Function**. Handles public API traffic, CORS, and provides the "Secure Tunnel" to bypass corporate Domain Restricted Sharing (DRS) policies.
-   `api-server.ts`: Local development server. Mirrors the logic of the Cloud Function for rapid local iteration.

### 🧠 Agent Logic (Python)
-   `agent/agent_engine_app.py`: The entry point for the **Vertex AI Reasoning Engine**. Standardizes the agent for deployment.
-   `agent/portfolio_data.py`: The **Single Source of Truth**. Contains all raw career milestones, project details, and certifications in structured format.
-   `agent/a2ui_templates.py`: The design system. Contains Python logic for generating A2UI JSON components.

---

## 💎 Component Overview

### 🗣️ Conversational Engine
- **Terminal UI**: A premium, "Gemini Dark" inspired chat interface.
- **Voice In/Out**: Integrated speech synthesis and recognition for voice-driven exploration.

### 🧩 High-Fidelity Components
The agent can dynamically render:
- **`Timeline`**: A visual, interactive map of career history.
- **`QuizCard`**: AI-generated challenges about Enrique's professional background.
- **`BadgeWall`**: A 3D-inspired gallery of 19x professional cloud certifications.
- **`CreativeMatrix`**: A strategic view of AI integration frameworks.
- **`VideoGallery`**: Embeds YouTube keynotes directly into the chat stream.

---

## 🛠️ Tech Stack Recap
- **LLM**: Gemini 2.5 Flash
- **Orchestration**: Google Vertex AI Agent Engine (Python ADK)
- **Backend Bridge**: Firebase Cloud Functions (1st/2nd Gen)
- **Hosting**: Firebase Hosting + Cloud Run
- **Frontend**: Vite, Lit (for Lightweight Components), vanilla CSS Custom Properties.
