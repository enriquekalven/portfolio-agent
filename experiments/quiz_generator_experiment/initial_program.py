import json
import random

def generate_quiz_prompt(topic: str, portfolio_data: dict, seed: int = 42) -> str:
    """
    Generate dynamic system instruction for QuizCard A2UI generation.
    """
    # EVOLVE-BLOCK-START
    random.seed(seed)
    
    quiz_categories = [
        "Cloud Certifications (GCP 10x, AWS 7x, Azure)",
        "Flagship Scale & Metrics (NBC Olympics 40M viewers, Disney+ global, AgentOps Cockpit)",
        "Career Timeline & Leadership (Google Cloud Outbound PM, AWS, Accenture)",
        "AI/ML Tech Stack (Vertex AI, ADK, RAG, Context Caching, A2UI)"
    ]
    
    selected_topic = topic if topic and topic.strip() else random.choice(quiz_categories)
    
    prompt = f"""You are Enrique K Chan's Portfolio Agent.
Generate a dynamic, high-signal QuizCard about Enrique K Chan.

## FOCUS TOPIC: {selected_topic}
## RANDOM SEED: {seed}

## Portfolio Context:
{json.dumps(portfolio_data)}

## Rules:
1. Create a 100% data-grounded quiz question specifically on: {selected_topic}.
2. DO NOT use static or generic questions. Formulate novel, technical questions.
3. Provide 3 to 4 distinct options with exactly ONE correct answer (`isCorrect: true`).
4. Include a detailed technical explanation for the answer.
5. Return ONLY valid A2UI JSON using the QuizCard component.

A2UI Template Blueprint:
[
  {{"beginRendering": {{"surfaceId": "portfolioContent", "root": "mainColumn"}}}},
  {{
    "surfaceUpdate": {{
      "surfaceId": "portfolioContent",
      "components": [
        {{
          "id": "mainColumn",
          "component": {{
            "Column": {{
              "children": {{"explicitList": ["q1"]}},
              "distribution": "start",
              "alignment": "stretch"
            }}
          }}
        }},
        {{
          "id": "q1",
          "component": {{
            "QuizCard": {{
              "question": {{"literalString": "[DYNAMIC_QUESTION_SPECIFIC_TO_TOPIC]"}},
              "options": [
                {{"label": {{"literalString": "[OPTION_1]"}}, "value": "opt1", "isCorrect": false}},
                {{"label": {{"literalString": "[CORRECT_OPTION]"}}, "value": "opt2", "isCorrect": true}},
                {{"label": {{"literalString": "[OPTION_3]"}}, "value": "opt3", "isCorrect": false}}
              ],
              "explanation": {{"literalString": "[EXPLANATION_GROUNDED_IN_PORTFOLIO_DATA]"}},
              "category": {{"literalString": "[SELECTED_CATEGORY]"}}
            }}
          }}
        }}
      ]
    }}
  }}
]
"""
    return prompt
    # EVOLVE-BLOCK-END
