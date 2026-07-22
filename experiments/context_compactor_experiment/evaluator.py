import sys
import json
import argparse
import importlib.util
from pathlib import Path

def evaluate_program(code: str, timeout_seconds: int = 30) -> dict:
    try:
        spec = importlib.util.spec_from_loader('program', loader=None)
        module = importlib.util.module_from_spec(spec)
        exec(code, module.__dict__)
        compact_fn = module.__dict__.get('compact_history')
        if not compact_fn:
            return {'score': 0.0, 'insights': [{'label': 'error', 'text': 'compact_history function missing'}]}
        
        # Test case 1: Short history preservation
        msg_short = [{'role': 'user', 'content': f'm{i}'} for i in range(5)]
        res_short = compact_fn(msg_short, limit=10)
        score1 = 1.0 if len(res_short) == 5 else 0.0
        
        # Test case 2: Long history retention of first and last messages within limit
        msg_long = [{'role': 'user', 'content': f'm{i}'} for i in range(20)]
        res_long = compact_fn(msg_long, limit=5)
        has_first = res_long[0]['content'] == 'm0' if res_long else False
        has_last = res_long[-1]['content'] == 'm19' if res_long else False
        within_limit = len(res_long) <= 5
        score2 = (1.0 if has_first else 0.0) + (1.0 if has_last else 0.0) + (1.0 if within_limit else 0.0)
        
        total_score = (score1 + score2) / 4.0
        return {'score': total_score, 'insights': [{'label': 'info', 'text': f'Score: {total_score}'}]}
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
