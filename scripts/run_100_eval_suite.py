import json
import time
import os
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agent.agent import get_agent

sem = asyncio.Semaphore(5)

async def evaluate_single_query(agent, case, idx, total_cases):
    async with sem:
        case_id = case["eval_case_id"]
        prompt_text = case["prompt"]["parts"][0]["text"]
        
        category_num = ((idx - 1) // 10) + 1
        category_name = f"Category_{category_num}"

        t0 = time.time()
        chunks = []
        error_msg = None
        try:
            async for response_chunk in agent.stream(prompt_text):
                if isinstance(response_chunk, dict):
                    if "text" in response_chunk:
                        chunks.append(str(response_chunk["text"]))
                    elif "a2ui" in response_chunk or "format" in response_chunk:
                        chunks.append(json.dumps(response_chunk))
                elif isinstance(response_chunk, str):
                    chunks.append(response_chunk)
        except Exception as e:
            error_msg = str(e)

        elapsed = time.time() - t0
        full_text = "".join(chunks).strip()

        # Quality scoring heuristics
        is_success = error_msg is None and len(full_text) > 15
        is_grounded = True
        
        prompt_lower = prompt_text.lower()
        if "olympic" in prompt_lower or "oli" in prompt_lower:
            is_grounded = "olympic" in full_text.lower() or "oli" in full_text.lower() or "nbc" in full_text.lower()
        elif "kurian" in prompt_lower or "thomas" in prompt_lower:
            is_grounded = "kurian" in full_text.lower() or "thomas" in full_text.lower()
        elif "disney" in prompt_lower:
            is_grounded = "disney" in full_text.lower() or "global" in full_text.lower()
        elif "cockpit" in prompt_lower:
            is_grounded = "cockpit" in full_text.lower() or "agentops" in full_text.lower()

        score = 1.0 if (is_success and is_grounded) else (0.5 if is_success else 0.0)

        status_symbol = "✅" if score == 1.0 else ("⚠️" if score > 0 else "❌")
        print(f"[{idx:03d}/{total_cases}] {status_symbol} {prompt_text[:50]:<50} | {elapsed:.2f}s | Score: {score:.1f}", flush=True)

        return {
            "case_id": case_id,
            "category_name": category_name,
            "query": prompt_text,
            "latency_sec": round(elapsed, 3),
            "response_length": len(full_text),
            "success": is_success,
            "grounded": is_grounded,
            "score": score,
            "error": error_msg,
            "preview": full_text[:120] + "..." if len(full_text) > 120 else full_text
        }

async def main_async():
    dataset_path = Path("tests/eval/datasets/100_queries_dataset.json")
    if not dataset_path.exists():
        print(f"Error: {dataset_path} not found.")
        sys.exit(1)

    with open(dataset_path) as f:
        data = json.load(f)

    eval_cases = data["eval_cases"]
    model_name = os.getenv('GENAI_MODEL', 'gemini-3.6-flash')
    print(f"Starting Concurrent Evaluation (5x parallel) on {len(eval_cases)} unique queries using model: {model_name}")
    print("=" * 80)

    agent = get_agent()
    start_time_all = time.time()

    tasks = [evaluate_single_query(agent, case, idx, len(eval_cases)) for idx, case in enumerate(eval_cases, 1)]
    results = await asyncio.gather(*tasks)

    category_metrics = {}
    for r in results:
        cat_name = r["category_name"]
        if cat_name not in category_metrics:
            category_metrics[cat_name] = {"scores": [], "latencies": []}
        category_metrics[cat_name]["scores"].append(r["score"])
        category_metrics[cat_name]["latencies"].append(r["latency_sec"])

    total_duration = time.time() - start_time_all
    avg_latency = sum(r["latency_sec"] for r in results) / len(results)
    avg_score = sum(r["score"] for r in results) / len(results)
    passed_cases = sum(1 for r in results if r["score"] >= 0.8)

    print("=" * 80)
    print(f"EVALUATION COMPLETE:")
    print(f"Total Cases Evaluated: {len(results)}")
    print(f"Passing Cases (Score >= 0.8): {passed_cases}/{len(results)} ({passed_cases/len(results)*100:.1f}%)")
    print(f"Average Quality Score: {avg_score:.3f}")
    print(f"Average Response Latency: {avg_latency:.3f}s")
    print(f"Total Duration: {total_duration:.2f}s")

    os.makedirs("artifacts", exist_ok=True)
    with open("artifacts/eval_results_100_queries.json", "w") as f:
        json.dump({
            "model": model_name,
            "total_queries": len(results),
            "passing_count": passed_cases,
            "avg_score": avg_score,
            "avg_latency_sec": avg_latency,
            "total_duration_sec": total_duration,
            "results": results
        }, f, indent=2)

    # Generate Markdown Report
    report_md = f"""# Portfolio Agent 100-Query Evaluation Report

## Executive Summary
- **Model Under Test**: `{model_name}`
- **Total Unique Queries**: `{len(results)}`
- **Pass Rate**: `{passed_cases}/{len(results)} ({passed_cases/len(results)*100:.1f}%)`
- **Average Quality Score**: `{avg_score:.3f} / 1.000`
- **Average Latency**: `{avg_latency:.3f} seconds`
- **Total Suite Runtime**: `{total_duration:.2f} seconds`

---

## Performance Breakdown by Category

| Category | Queries | Avg Score | Avg Latency | Pass Rate |
|----------|---------|-----------|-------------|-----------|
"""
    cat_names = [
        ("Category_1", "Profile & Background"),
        ("Category_2", "Google Cloud Experience"),
        ("Category_3", "Flagship Projects"),
        ("Category_4", "AWS & Accenture"),
        ("Category_5", "Certifications & Badges"),
        ("Category_6", "Awards & Honors"),
        ("Category_7", "Testimonials & Quotes"),
        ("Category_8", "Publications & Blogs"),
        ("Category_9", "Keynotes & Video Cards"),
        ("Category_10", "Skill Matcher & Formats")
    ]

    for cat_id, cat_title in cat_names:
        metrics = category_metrics.get(cat_id, {"scores": [0], "latencies": [0]})
        c_scores = metrics["scores"]
        c_lats = metrics["latencies"]
        c_avg_score = sum(c_scores) / len(c_scores)
        c_avg_lat = sum(c_lats) / len(c_lats)
        c_pass = sum(1 for s in c_scores if s >= 0.8)
        report_md += f"| **{cat_title}** | {len(c_scores)} | {c_avg_score:.2f} | {c_avg_lat:.2f}s | {c_pass}/{len(c_scores)} ({c_pass/len(c_scores)*100:.0f}%) |\n"

    report_md += """
---

## Detailed Sample Query Results (First 10)

| Case ID | Query Prompt | Latency | Score | Output Preview |
|---------|--------------|---------|-------|----------------|
"""
    for r in results[:10]:
        preview_clean = r["preview"].replace("\n", " ")
        report_md += f"| `{r['case_id']}` | {r['query']} | `{r['latency_sec']}s` | `{r['score']}` | {preview_clean} |\n"

    with open("artifacts/eval_report_100_queries.md", "w") as f:
        f.write(report_md)

    print(f"Report saved to artifacts/eval_report_100_queries.md and json saved to artifacts/eval_results_100_queries.json")

if __name__ == "__main__":
    asyncio.run(main_async())
