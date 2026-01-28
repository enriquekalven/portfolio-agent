import vertexai
from vertexai.resources.preview import reasoning_engines

vertexai.init(project="project-maui", location="us-central1")

try:
    print("Listing Reasoning Engines...")
    engines = reasoning_engines.ReasoningEngine.list()
    if not engines:
        print("No reasoning engines found.")
    for engine in engines:
        print(f"Name: {engine.resource_name}")
        print(f"Display Name: {engine.display_name}")
        # print(f"State: {engine.state}") # Not all preview objects have state
except Exception as e:
    print(f"Error: {e}")
