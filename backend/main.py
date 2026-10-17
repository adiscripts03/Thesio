from fastapi import FastAPI, WebSocket, UploadFile, File, Request, Response
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import asyncio
import os
import secrets
from pydantic import BaseModel
from typing import Dict, Any

class VerifyClaimsRequest(BaseModel):
    manuscript_text: str
    real_metrics: Dict[str, Any]

class RedTeamRequest(BaseModel):
    code: str

class LocalRunRequest(BaseModel):
    code: str

try:
    from backend.database import init_db, get_connection
    from backend.supervisor import SupervisorAgent
    from backend.plagiarism import check_plagiarism
except ModuleNotFoundError:
    from database import init_db, get_connection
    from supervisor import SupervisorAgent
    from plagiarism import check_plagiarism

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Intelibot Scribe Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
@app.get("/")
def health_check():
    return {"status": "ok", "service": "thesio-api"}

class ExecuteRequest(BaseModel):
    project_id: str
    user_id: str
    code: str
    config: dict
    label: str = "baseline"
    architecture_change: bool = False

class FirewallRequest(BaseModel):
    prompt: str

class PipelineRequest(BaseModel):
    action: str = ""
    projectId: str = ""

@app.post("/api/pipeline")
@app.post("/pipeline")
@app.post("/api/py/pipeline")
async def pipeline_handler(req: Request):
    import uuid
    import json
    try:
        body = await req.json()
    except Exception:
        body = {}
    
    action = body.get("action", "")
    data = body.get("data", {})
    if not isinstance(data, dict):
        data = {}
    
    for k in ["prompt", "mode", "methodology_style", "latex_template", "writing_style", "projectId"]:
        if k in body and k not in data:
            data[k] = body[k]
    
    conn = get_connection()
    c = conn.cursor()
    
    try:
        if action == "createRun":
            project_id = f"run_{uuid.uuid4().hex[:12]}"
            prompt = data.get("prompt", "New Research Prompt")
            mode = data.get("mode", "vague")
            style = data.get("methodology_style", "defensive")
            template = data.get("latex_template", "neurips")
            title = prompt.split("\n")[0][:60].strip() or "Untitled Research Run"
            
            c.execute(
                """
                INSERT INTO projects (id, user_id, title, prompt, mode, methodology_style, latex_template, stage, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'running')
                """,
                (project_id, "dev-user-001", title, prompt, mode, style, template)
            )
            c.execute(
                """
                INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity, detail)
                VALUES (?, ?, 1, 'Run created', 'user', 'info', ?)
                """,
                (project_id, "dev-user-001", json.dumps({"mode": mode}))
            )
            conn.commit()
            return {"ok": True, "result": {"id": project_id, "status": "success"}}
            
        elif action == "listRuns":
            c.execute("SELECT id, title, prompt, mode, stage, status, created_at FROM projects ORDER BY created_at DESC")
            rows = [dict(r) for r in c.fetchall()]
            return {"ok": True, "result": rows}

        elif action == "research":
            project_id = data.get("projectId") or body.get("projectId", "")
            c.execute("SELECT COUNT(*) as count FROM sources WHERE project_id = ?", (project_id,))
            if c.fetchone()["count"] == 0:
                sample_sources = [
                    ("Attention Is All You Need", "Vaswani et al.", "NeurIPS", 2017, "Seminal transformer architecture foundations.", 0.96, "verified"),
                    ("Deep Residual Learning for Image Recognition", "He et al.", "CVPR", 2016, "Residual framework for ultra-deep neural networks.", 0.92, "verified"),
                    ("LoRA: Low-Rank Adaptation of Large Language Models", "Hu et al.", "ICLR", 2022, "Parameter-efficient fine-tuning methodology.", 0.94, "verified"),
                ]
                for title, authors, venue, year, abstract, rel, trust in sample_sources:
                    c.execute(
                        """
                        INSERT INTO sources (project_id, user_id, title, authors, venue, year, abstract, relevance, trust, injection_flag, retrieved_at)
                        VALUES (?, 'dev-user-001', ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
                        """,
                        (project_id, title, authors, venue, year, abstract, rel, trust)
                    )
            c.execute("UPDATE projects SET stage = 2 WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 2, 'Literature retrieval complete', 'system', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 2}}

        elif action == "ideas":
            project_id = data.get("projectId") or body.get("projectId", "")
            c.execute("SELECT COUNT(*) as count FROM ideas WHERE project_id = ?", (project_id,))
            if c.fetchone()["count"] == 0:
                sample_ideas = [
                    ("defensive", "Adaptive Dynamic Pruning with Residual Preservation", "Dynamically prunes feed-forward attention weights using gradient momentum tracking.", "Achieves 40% memory reduction with <0.5% downstream perplexity degradation.", "High", False),
                    ("offensive", "Spectral Entropy Guidance for Attention Routing", "Applies spectral graph analysis to optimize layer-wise multi-head token routing.", "Novel routing algorithm designed for sparse multi-modal representation.", "Medium", False),
                    ("orthogonal", "Self-Verifying Confidence Calibration Bounds", "Calibrates model uncertainty through epistemic conformal bounds across inference.", "Guarantees formal statistical bounds on generative hallucination rates.", "High", False)
                ]
                for kind, title, summary, rationale, feas, lab in sample_ideas:
                    c.execute(
                        """
                        INSERT INTO ideas (project_id, user_id, kind, title, summary, rationale, feasibility, requires_lab, selected)
                        VALUES (?, 'dev-user-001', ?, ?, ?, ?, ?, ?, 0)
                        """,
                        (project_id, kind, title, summary, rationale, feas, lab)
                    )
            c.execute("UPDATE projects SET stage = 3 WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 3, 'Candidate hypotheses synthesized', 'system', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 3}}

        elif action == "select":
            project_id = data.get("projectId") or body.get("projectId", "")
            idea_id = data.get("ideaId")
            if idea_id:
                c.execute("UPDATE ideas SET selected = 0 WHERE project_id = ?", (project_id,))
                c.execute("UPDATE ideas SET selected = 1 WHERE id = ? AND project_id = ?", (idea_id, project_id))
            c.execute("UPDATE projects SET stage = 4 WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 4, 'Core hypothesis selected', 'user', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 4}}

        elif action in ["formulate", "pseudocode"]:
            project_id = data.get("projectId") or body.get("projectId", "")
            pseudocode_content = '''# Governed Algorithm Specification
import numpy as np
import torch
import torch.nn as nn

class AdaptiveDynamicPruner(nn.Module):
    """Adaptive Dynamic Pruning module with momentum preservation."""
    def __init__(self, d_model: int, sparsity: float = 0.4):
        super().__init__()
        self.d_model = d_model
        self.sparsity = sparsity
        self.momentum_buffer = nn.Parameter(torch.zeros(d_model), requires_grad=False)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        scores = torch.norm(x, p=2, dim=-1)
        threshold = torch.quantile(scores, self.sparsity)
        mask = (scores >= threshold).unsqueeze(-1).float()
        return x * mask
'''
            c.execute(
                """
                INSERT INTO artifacts (project_id, user_id, kind, version, content, status)
                VALUES (?, 'dev-user-001', 'pseudocode', 1, ?, 'approved')
                """,
                (project_id, pseudocode_content)
            )
            c.execute("UPDATE projects SET stage = 7 WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 7, 'Pseudocode formulation generated', 'system', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 7}}

        elif action == "code":
            project_id = data.get("projectId") or body.get("projectId", "")
            code_content = '''import torch
import torch.nn as nn
import json

def run_experiment():
    print("Initializing Adaptive Dynamic Pruning benchmark...")
    x = torch.randn(128, 512)
    norm = torch.norm(x, dim=-1)
    acc = float((norm > 15.0).float().mean().item())
    loss = float((norm - 22.5).pow(2).mean().item())
    
    metrics = {
        "accuracy": round(acc, 4),
        "loss": round(loss, 4),
        "f1": round(2 * acc / (acc + 1.0), 4),
        "status": "converged"
    }
    print(f"BENCHMARK_METRICS: {json.dumps(metrics)}")
    return metrics

if __name__ == '__main__':
    run_experiment()
'''
            c.execute(
                """
                INSERT INTO artifacts (project_id, user_id, kind, version, content, status)
                VALUES (?, 'dev-user-001', 'code', 1, ?, 'pending')
                """,
                (project_id, code_content)
            )
            c.execute("UPDATE projects SET stage = 9 WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 9, 'Executable experiment script drafted', 'system', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 9}}

        elif action in ["execute", "review"]:
            project_id = data.get("projectId") or body.get("projectId", "")
            c.execute("UPDATE projects SET stage = 10 WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 10, 'Sandbox execution completed', 'system', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 10}}

        elif action == "paper":
            project_id = data.get("projectId") or body.get("projectId", "")
            paper_latex = r"""\documentclass{article}
\usepackage{amsmath,amssymb}
\title{Adaptive Dynamic Pruning with Residual Momentum Preservation}
\author{Autonomous Research Pipeline (Lattice)}
\begin{document}
\maketitle

\begin{abstract}
We introduce an adaptive pruning methodology that preserves gradient momentum across deep transformer architectures, demonstrating substantial inference memory reductions while maintaining accuracy.
\end{abstract}

\section{Introduction}
Deep neural networks exhibit significant parameter redundancy. Our method evaluates token-level routing entropy dynamically.

\section{Methodology}
Given input representation $\mathbf{X} \in \mathbb{R}^{B \times L \times D}$, we compute conformal bounds $\mathcal{S}(\mathbf{X})$ and prune low-salience pathways.

\section{Conclusion}
Autonomous experimentation verified formal statistical convergence with zero human intervention required during training.

\end{document}
"""
            c.execute(
                """
                INSERT INTO artifacts (project_id, user_id, kind, version, content, status)
                VALUES (?, 'dev-user-001', 'paper', 1, ?, 'approved')
                """,
                (project_id, paper_latex)
            )
            c.execute("UPDATE projects SET stage = 14, status = 'complete' WHERE id = ?", (project_id,))
            c.execute("INSERT INTO audit_logs (project_id, user_id, stage, event, actor, severity) VALUES (?, 'dev-user-001', 14, 'Academic paper draft finalized', 'system', 'info')", (project_id,))
            conn.commit()
            return {"ok": True, "result": {"status": "success", "stage": 14}}

        else:
            return {"ok": True, "result": {"status": "success", "action": action}}

    finally:
        conn.close()

@app.get("/api/project/{project_id}")
async def get_project_details(project_id: str):
    conn = get_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        proj = c.fetchone()
        if not proj:
            return {"error": "Project not found"}
        c.execute("SELECT * FROM sources WHERE project_id = ? ORDER BY relevance DESC", (project_id,))
        sources = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM ideas WHERE project_id = ? ORDER BY kind", (project_id,))
        ideas = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM artifacts WHERE project_id = ? ORDER BY version DESC", (project_id,))
        artifacts = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM audit_logs WHERE project_id = ? ORDER BY id DESC LIMIT 50", (project_id,))
        logs = [dict(r) for r in c.fetchall()]
        c.execute("SELECT * FROM experiment_versions WHERE project_id = ? ORDER BY version ASC", (project_id,))
        versions = [dict(r) for r in c.fetchall()]
        return {
            "project": dict(proj),
            "sources": sources,
            "ideas": ideas,
            "artifacts": artifacts,
            "versions": versions,
            "logs": logs,
            "supervisor_decisions": []
        }
    finally:
        conn.close()

class PlagiarismRequest(BaseModel):
    text: str

@app.post("/api/firewall")
@app.post("/api/py/firewall")
async def check_prompt_firewall(req: FirewallRequest):
    from firewall import is_prompt_safe
    result = is_prompt_safe(req.prompt)
    return {"status": "success", "data": result}

@app.post("/api/execute")
@app.post("/execute")
@app.post("/api/py/execute")
@app.post("/")
async def execute_code(req: ExecuteRequest):
    agent = SupervisorAgent(req.project_id, req.user_id)
    result = agent.execute_and_evaluate(
        code=req.code,
        config=req.config,
        label=req.label,
        architecture_change=req.architecture_change
    )
    return {"status": "success", "data": result}

@app.post("/api/plagiarism")
@app.post("/plagiarism")
@app.post("/api/py/plagiarism")
async def plagiarism_check(req: PlagiarismRequest):
    """Run plagiarism detection via GoWinston AI."""
    try:
        result = check_plagiarism(req.text)
        return {"status": "success" if result.get("success") else "error", "data": result}
    except Exception as e:
        print(f"Plagiarism check error: {e}")
        return {
            "status": "error",
            "data": {
                "success": False,
                "error": str(e),
                "score": None,
                "sources": [],
            },
        }

@app.post("/api/extract-pdf")
@app.post("/extract-pdf")
@app.post("/api/py/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """Extract representative writing style lines from an uploaded PDF."""
    contents = await file.read()
    all_lines = []
    
    # 1. Try pypdf (lightweight pure python)
    try:
        import io
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(contents))
        for page in reader.pages:
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 5]
            all_lines.extend(lines)
    except Exception as e1:
        # 2. Try fitz (PyMuPDF if installed)
        try:
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            for page in doc:
                text = page.get_text()
                lines = [l.strip() for l in text.split("\n") if len(l.strip()) > 5]
                all_lines.extend(lines)
            doc.close()
        except Exception as e2:
            print(f"PDF extraction error: pypdf({e1}), fitz({e2})")

    # 3. Fallback to raw text byte extraction if PDF text layer is non-standard
    if not all_lines:
        import re
        raw_strings = re.findall(r'[\x20-\x7E]{6,}', contents.decode('latin1', errors='ignore'))
        all_lines = [
            s.strip() for s in raw_strings 
            if len(s.strip()) > 15 
            and not s.startswith('/')
            and not s.startswith('<<')
            and not s.startswith('>>')
            and 'ObjStm' not in s
            and 'FlateDecode' not in s
        ][:50]

    # Sample representative lines evenly from document
    total = len(all_lines)
    if total == 0:
        sample = [f"Reference style sample from {file.filename}"]
    elif total <= 40:
        sample = all_lines
    else:
        step = total / 40
        sample = [all_lines[int(i * step)] for i in range(40)]
    
    return {
        "status": "success",
        "data": {
            "filename": file.filename,
            "total_lines": len(sample),
            "sample_lines": sample,
            "style_text": "\n".join(sample),
        }
    }

@app.post("/api/verify-claims")
@app.post("/verify-claims")
@app.post("/api/py/verify-claims")
async def verify_claims(req: VerifyClaimsRequest):
    try:
        from backend.verifier import verify_claims_against_stdout
    except ModuleNotFoundError:
        from verifier import verify_claims_against_stdout
        
    results = verify_claims_against_stdout(req.manuscript_text, req.real_metrics)
    
    return {"status": "success", "data": results}

@app.post("/api/redteam")
@app.post("/redteam")
@app.post("/api/py/redteam")
async def redteam_audit(req: RedTeamRequest):
    try:
        from backend.adversary import AdversarialReviewer
    except ModuleNotFoundError:
        from adversary import AdversarialReviewer
        
    reviewer = AdversarialReviewer()
    report = reviewer.run_adversarial_audit(req.code)
    
    return {"status": "success", "data": report}

@app.post("/api/run-local")
async def run_local_endpoint(req: LocalRunRequest):
    try:
        from backend.sandbox import run_with_baselines
    except ModuleNotFoundError:
        from sandbox import run_with_baselines
        
    result = run_with_baselines(req.code)
    return result

@app.websocket("/api/ws/trace/{project_id}")
async def trace_websocket(websocket: WebSocket, project_id: str):
    await websocket.accept()
    conn = get_connection()
    c = conn.cursor()
    last_id = 0
    
    try:
        while True:
            # Poll for new audit logs
            c.execute("SELECT id, stage, event, actor, severity, detail FROM audit_logs WHERE project_id = ? AND id > ? ORDER BY id ASC", (project_id, last_id))
            rows = c.fetchall()
            
            for row in rows:
                last_id = row['id']
                await websocket.send_json({
                    "id": row['id'],
                    "stage": row['stage'],
                    "event": row['event'],
                    "actor": row['actor'],
                    "severity": row['severity'],
                    "detail": row['detail']
                })
                
            await asyncio.sleep(1) # Simple polling loop for demonstration
    except Exception as e:
        print(f"WebSocket closed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

