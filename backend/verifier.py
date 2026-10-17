import re
from typing import Dict, Any, List

def verify_claims_against_stdout(manuscript_text: str, real_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Parses claim tags from manuscript and deterministically validates 
    them against the real metrics extracted from container stdout.
    """
    pattern = re.compile(r'<claim target="(?P<target>[^"]+)" value="(?P<value>[^"]+)">(?P<text>[^<]+)</claim>')
    results = []
    
    for match in pattern.finditer(manuscript_text):
        target = match.group("target")
        claimed_val = float(match.group("value"))
        text = match.group("text")
        
        actual_val = real_metrics.get(target)
        if actual_val is None:
            results.append({
                "target": target,
                "claimed": claimed_val,
                "actual": None,
                "text": text,
                "status": "UNSUPPORTED",
                "badge": "red"
            })
        else:
            actual_float = float(actual_val)
            delta = abs(claimed_val - actual_float)
            if delta <= 0.01:
                results.append({
                    "target": target,
                    "claimed": claimed_val,
                    "actual": actual_float,
                    "text": text,
                    "status": "VERIFIED",
                    "badge": "green"
                })
            else:
                results.append({
                    "target": target,
                    "claimed": claimed_val,
                    "actual": actual_float,
                    "text": text,
                    "status": "DISCREPANCY_FLAGGED",
                    "delta": delta,
                    "badge": "amber"
                })
    return results
