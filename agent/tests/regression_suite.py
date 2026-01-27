import asyncio
import json
import os
import sys
from pathlib import Path
import difflib

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent import get_agent

TEST_CASES = [
    {"format": "flashcards", "context": "tell me about your AI skills"},
    {"format": "flashcards", "context": "how does your experience fit a senior AI lead role?"},
    {"format": "timeline", "context": "career progression"},
    {"format": "blog_cards", "context": "technical writing"},
    {"format": "video_cards", "context": "keynotes and talks"},
    {"format": "awards", "context": "recognitions"},
    {"format": "certs", "context": "cloud certifications"},
    {"format": "testimonials", "context": "what googlers say"},
    {"format": "speaker", "context": "speaking events"},
    {"format": "gallery", "context": "visual achievements"},
]

BASELINE_FILE = Path(__file__).parent / "baseline_outputs.json"

async def run_tests(save_baseline=False):
    agent = get_agent()
    current_outputs = {}
    
    print(f"Running {len(TEST_CASES)} regression tests...")
    
    for case in TEST_CASES:
        format_type = case["format"]
        context = case["context"]
        test_id = f"{format_type}:{context}"
        
        print(f"Testing: {test_id}")
        try:
            result = await agent.generate_content(format_type, context)
            # Remove transient or randomized fields if any (like session IDs if they were in the output)
            # In this agent, the output is mostly stable A2UI
            current_outputs[test_id] = result
        except Exception as e:
            print(f"Error testing {test_id}: {e}")
            current_outputs[test_id] = {"error": str(e)}

    if save_baseline:
        with open(BASELINE_FILE, "w") as f:
            json.dump(current_outputs, f, indent=2)
        print(f"\nBaseline saved to {BASELINE_FILE}")
        return True

    if not BASELINE_FILE.exists():
        print(f"\nNo baseline found at {BASELINE_FILE}. Run with --save to create one.")
        return False

    with open(BASELINE_FILE, "r") as f:
        baseline_outputs = json.load(f)

    regressions = []
    for test_id, current_result in current_outputs.items():
        if test_id not in baseline_outputs:
            print(f"New test case: {test_id} (not in baseline)")
            continue
            
        baseline_result = baseline_outputs[test_id]
        
        # Simple JSON comparison
        if current_result != baseline_result:
            print(f"\nREGRESSION DETECTED: {test_id}")
            
            # Detailed diff for the A2UI content
            baseline_str = json.dumps(baseline_result.get("a2ui", baseline_result), indent=2)
            current_str = json.dumps(current_result.get("a2ui", current_result), indent=2)
            
            diff = difflib.unified_diff(
                baseline_str.splitlines(),
                current_str.splitlines(),
                fromfile="baseline",
                tofile="current",
                lineterm=""
            )
            print("\n".join(list(diff)))
            regressions.append(test_id)

    if regressions:
        print(f"\nTotal regressions found: {len(regressions)}")
        return False
    else:
        print("\nAll tests passed! No regressions detected.")
        return True

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--save", action="store_true", help="Save current outputs as baseline")
    args = parser.parse_args()
    
    success = asyncio.run(run_tests(save_baseline=args.save))
    sys.exit(0 if success else 1)
