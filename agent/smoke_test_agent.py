from vertexai.agent_engines.templates.adk import AdkApp

class SmokeTestAgent:

    def query(self, text: str) -> str:
        return f'Smoke test: {text}'
app = SmokeTestAgent()
agent_engine = AdkApp(app=app)