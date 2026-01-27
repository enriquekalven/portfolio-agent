---
description: Quickest way to deploy the Frontend component to Firebase Hosting
---
// turbo-all
1. Build the frontend assets:
   ```bash
   npm run build
   ```

2. Deploy to Cloud Run (API Bridge) and Firebase Hosting (Static Face):
   ```bash
   npm run deploy:hosting -- --project [YOUR_PROJECT_ID]
   ```
   *Note: Replace `[YOUR_PROJECT_ID]` with your actual Google Cloud Project ID.*

3. (Optional) If you have already deployed the backend and bridge, you can deploy just the static assets:
   ```bash
   firebase deploy --only hosting --project [YOUR_PROJECT_ID]
   ```

4. Access your live agent UI:
   - The URL will be `https://[YOUR_PROJECT_ID].web.app`
