import vertexai
from vertexai import agent_engines
import json

vertexai.init(project="project-maui", location="us-central1")

resource_id = "1739406504420704256"
engine = agent_engines.ReasoningEngine(f"projects/697625214430/locations/us-central1/reasoningEngines/{resource_id}")

print(f"Querying Agent Engine {resource_id}...")
try:
    # Use the same logic as the server
    response = engine.query(input={"message": "awards", "user_id": "test-user"})
    print("Response received:")
    print(json.dumps(response, indent=2))
except Exception as e:
    print(f"Error: {e}")
