import sys
import json
import argparse
import importlib.util
from pathlib import Path

def evaluate_program(code: str) -> dict:
    try:
        spec = importlib.util.spec_from_loader('program', loader=None)
        module = importlib.util.module_from_spec(spec)
        exec(code, module.__dict__)
        verify_fn = module.__dict__.get('verify_gems_routing')
        if not verify_fn:
            return {'score': 0.0, 'insights': [{'label': 'error', 'text': 'verify_gems_routing function missing'}]}
        
        gems = [
            "gem-historian", "gem-matcher", "gem-analyzer", "gem-media",
            "gem-blogs", "gem-awards", "gem-certs", "gem-speaker",
            "gem-testimonials", "gem-gallery", "gem-repos"
        ]
        
        passed = 0
        failed_gems = []
        
        for g in gems:
            res = verify_fn(g)
            if res.get('valid'):
                passed += 1
            else:
                failed_gems.append(f"{g} (got {res.get('detected')}, expected {res.get('expected')})")
                
        score = passed / len(gems)
        return {
            'score': score,
            'insights': [{'label': 'info', 'text': f'Passed: {passed}/{len(gems)}. Failures: {", ".join(failed_gems) if failed_gems else "None"}'}]
        }
    except Exception as e:
        return {'score': 0.0, 'insights': [{'label': 'error', 'text': str(e)}]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-file', required=True)
    parser.add_argument('--program-dir', required=True)
    args = parser.parse_args()
    
    prog_path = Path(args.program_dir) / 'initial_program.py'
    code = prog_path.read_text()
    result = evaluate_program(code)
    
    with open(args.output_file, 'w') as f:
        json.dump(result, f, indent=2)

if __name__ == '__main__':
    main()
