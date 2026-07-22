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
        gen_prompt_fn = module.__dict__.get('generate_quiz_prompt')
        if not gen_prompt_fn:
            return {'score': 0.0, 'insights': [{'label': 'error', 'text': 'generate_quiz_prompt function missing'}]}
        
        mock_data = {
            "CERTIFICATIONS": {"google": 10, "aws": 7},
            "PROJECTS": [{"name": "NBC Olympics", "viewers": "40M"}],
            "EXPERIENCE": [{"company": "Google Cloud", "role": "Outbound PM"}]
        }
        
        generated_prompts = []
        topics = ["certifications", "olympics", "career", "", "tech stack"]
        
        for idx, topic in enumerate(topics):
            prompt = gen_prompt_fn(topic, mock_data, seed=idx*10+1)
            generated_prompts.append(prompt)
            
        # Evaluation metrics:
        # 1. No hardcoded Netflix/static questions penalty
        static_penalty = 0
        for p in generated_prompts:
            if "netflix" in p.lower() or "did enrique not work for" in p.lower():
                static_penalty += 0.2
                
        # 2. Topic diversity score
        unique_focus_lines = set()
        for p in generated_prompts:
            for line in p.split('\n'):
                if 'FOCUS TOPIC:' in line or 'topic:' in line.lower():
                    unique_focus_lines.add(line)
        diversity_score = min(1.0, len(unique_focus_lines) / len(topics))
        
        # 3. Dynamic placeholder score
        placeholder_score = 1.0 if all("[DYNAMIC_QUESTION_SPECIFIC_TO_TOPIC]" in p for p in generated_prompts) else 0.5
        
        raw_score = (diversity_score * 0.5) + (placeholder_score * 0.5) - static_penalty
        final_score = max(0.0, min(1.0, raw_score))
        
        return {
            'score': final_score,
            'insights': [{'label': 'info', 'text': f'Diversity: {diversity_score:.2f}, Placeholder: {placeholder_score:.2f}, Penalty: {static_penalty:.2f}'}]
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
