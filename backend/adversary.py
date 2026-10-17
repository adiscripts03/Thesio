import ast
import json
import statistics
import logging

try:
    from backend.sandbox import run_with_baselines
    from backend.llm_engine import call_llm
except ModuleNotFoundError:
    from sandbox import run_with_baselines
    from llm_engine import call_llm

logger = logging.getLogger(__name__)

class AdversarialReviewer:
    def __init__(self):
        pass

    def check_ast_data_leakage(self, code: str) -> dict:
        """
        Linter that checks for common data leakage patterns:
        - fit_transform called on validation/test sets
        - train_test_split missing
        """
        issues = []
        try:
            tree = ast.parse(code)
            has_split = False
            for node in ast.walk(tree):
                if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "train_test_split":
                    has_split = True
                
                # Check for fit_transform on test data
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                    if node.func.attr == "fit_transform":
                        for arg in node.args:
                            if isinstance(arg, ast.Name) and "test" in arg.id.lower():
                                issues.append(f"Data Leakage Detected: fit_transform called on test subset variable '{arg.id}'.")
            
            if not has_split and "sklearn" in code:
                issues.append("Rigor Warning: 'train_test_split' not found in code. Model may be trained and evaluated on the same dataset.")
        except Exception as e:
            issues.append(f"AST Parsing Error: {e}")
            
        return {
            "passed": len(issues) == 0,
            "issues": issues
        }

    def check_seed_perturbation(self, code: str) -> dict:
        """
        Runs the code across 3 seeds to check for metric variance (P-Hacking defense).
        """
        seeds = [42, 1337, 2026]
        accuracies = []
        
        for seed in seeds:
            # We inject the seed dynamically at the top of the code to ensure randomness is controlled
            injected_code = f"import numpy as np; np.random.seed({seed})\nimport torch; torch.manual_seed({seed})\n{code}"
            try:
                res = run_with_baselines(injected_code)
                acc = res.get('baselines', {}).get('proposed')
                if acc is not None:
                    accuracies.append(acc)
            except Exception:
                pass
                
        if len(accuracies) < 2:
            return {"passed": False, "variance": 0.0, "message": "Failed to run perturbation tests or unsupported code structure."}
            
        variance = statistics.stdev(accuracies) if len(accuracies) > 1 else 0.0
        
        return {
            "passed": variance < 0.15,
            "variance": round(variance, 4),
            "accuracies": accuracies,
            "message": f"High variance detected ({variance:.4f})" if variance >= 0.15 else "Results are stable across seeds."
        }

    def run_adversarial_audit(self, code: str) -> dict:
        """
        Executes the full red-team matrix.
        """
        leakage_report = self.check_ast_data_leakage(code)
        perturbation_report = self.check_seed_perturbation(code)
        
        score = 10.0
        if not leakage_report["passed"]:
            score -= 4.0
        if not perturbation_report["passed"]:
            score -= 3.0
            
        return {
            "overall_score": max(1.0, score),
            "data_leakage": leakage_report,
            "seed_variance": perturbation_report,
            "verdict": "ACCEPT" if score >= 8.0 else ("MINOR_REVISION" if score >= 5.0 else "REJECT_P_HACKING")
        }
