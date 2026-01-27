---
description: How to deploy the Portfolio Agent to Firebase and Agent Engine
---
// turbo-all
1. Deploy the Python Agent to Vertex AI Agent Engine:
   ```bash
   PYTHONPATH=. python3 agent/deploy_ae.py --project project-maui
   ```
   *Note: This will return a **Resource ID**. You will need this for the next step.*

2. Update your `.env` file with the new **Resource ID**:
   ```text
   AGENT_ENGINE_RESOURCE_ID=your-resource-id-here
   AGENT_ENGINE_PROJECT_NUMBER=your-project-number
   ```

3. Deploy the UI and API Bridge to Cloud Run + Firebase Hosting:
   ```bash
   python3 deploy_hosting.py --project project-maui
   ```

4. Verify the deployment:
   - Your UI will be live at `https://project-maui.web.app` or `https://enriq-portfolio-agent.web.app` (depending on Firebase project settings).
   - The Cloud Run bridge will handle routing between the UI and the Agent Engine.
