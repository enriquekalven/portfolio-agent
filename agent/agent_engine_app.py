import logging
import os
from typing import Any
import vertexai
from dotenv import load_dotenv
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from vertexai.agent_engines.templates.adk import AdkApp
try:
    from agent.app import app as adk_app
    from agent.app_utils.telemetry import setup_telemetry
    from agent.app_utils.typing import Feedback
except ImportError:
    from app import app as adk_app
    from app_utils.telemetry import setup_telemetry
    from app_utils.typing import Feedback
load_dotenv()

class AgentEngineApp(AdkApp):

    def set_up(self) -> None:
        """Initialize the agent engine app with logging and telemetry."""
        vertexai.init()
        setup_telemetry()
        super().set_up()
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        gemini_location = os.environ.get('GOOGLE_CLOUD_LOCATION')
        if gemini_location:
            os.environ['GOOGLE_CLOUD_LOCATION'] = gemini_location

    def register_feedback(self, feedback: dict[str, Any]) -> None:
        """Collect and log feedback."""
        feedback_obj = Feedback.model_validate(feedback)
        self.logger.info(f'Feedback received: {feedback_obj.model_dump()}')

    def register_operations(self) -> dict[str, list[str]]:
        """Registers the operations of the Agent."""
        operations = super().register_operations()
        operations[''] = operations.get('', []) + ['register_feedback']
        return operations
gemini_location = os.environ.get('GOOGLE_CLOUD_LOCATION')
logs_bucket_name = os.environ.get('LOGS_BUCKET_NAME')
agent_engine = AgentEngineApp(app=adk_app, artifact_service_builder=lambda: GcsArtifactService(bucket_name=logs_bucket_name) if logs_bucket_name else InMemoryArtifactService())