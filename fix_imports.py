
import os

target_dir = "/Users/enriq/Documents/git/agent-cockpit/src"
target_string = "from google.adk.agents.context_cache_config import ContextCacheConfig"
replacement = """try:
    from google.adk.agents.context_cache_config import ContextCacheConfig
except (ImportError, AttributeError, ModuleNotFoundError):
    ContextCacheConfig = None"""

for root, dirs, files in os.walk(target_dir):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            if target_string in content:
                # Check if it's already wrapped
                if "try:" in content[max(0, content.find(target_string)-20):content.find(target_string)]:
                    continue
                
                print(f"Fixing {path}")
                new_content = content.replace(target_string, replacement)
                with open(path, "w") as f:
                    f.write(new_content)
