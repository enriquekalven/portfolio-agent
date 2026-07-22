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
        router_fn = module.__dict__.get('route_and_enrich_intent')
        if not router_fn:
            return {'score': 0.0, 'insights': [{'label': 'error', 'text': 'route_and_enrich_intent function missing'}]}
        
        test_cases = [
            ("What awards has Enrique won at Google?", "awards", "awards"),
            ("Show me his certifications and credentials", "certs", "certs"),
            ("Tell me about his career journey and history", "timeline", "timeline"),
            ("Did he work on the NBC Olympics chatbot?", "general", "olympics"),
            ("Show me medium blog posts and articles", "blog_cards", "blog"),
            ("Can you analyze his skill match for AI PM?", "flashcards", "skill"),
        ]
        
        correct_format = 0
        correct_keywords = 0
        
        for msg, expected_fmt, expected_kw in test_cases:
            res = router_fn(msg)
            if res.get('format') == expected_fmt:
                correct_format += 1
            if expected_kw in res.get('keywords', '').lower():
                correct_keywords += 1
                
        format_score = correct_format / len(test_cases)
        kw_score = correct_keywords / len(test_cases)
        total_score = (format_score * 0.6) + (kw_score * 0.4)
        
        return {'score': total_score, 'insights': [{'label': 'info', 'text': f'Format Acc: {format_score:.2f}, Keyword Acc: {kw_score:.2f}'}]}
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
