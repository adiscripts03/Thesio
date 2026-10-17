# 🔬 ResearchBuddy

> **Autonomous Scientific Research Operating System powered by Gemma 4**  
> *Made for Hactoberfest Hack Day x AWS SBG RTMSSU*

[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-Hack_Day_x_AWS_SBG_RTMSSU-FF8800.svg)](#)
[![Inference](https://img.shields.io/badge/Inference-Gemma_4_(API_%26_Local)-4285F4.svg)](#)
[![Apple Silicon Metal](https://img.shields.io/badge/Acceleration-Metal_GPU-000000.svg)](#)
[![TypeScript](https://img.shields.io/badge/Stack-TypeScript_%7C_Python_%7C_React-blue.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

---

## 🌟 Overview

**ResearchBuddy** elevates autonomous AI research from isolated script generation to rigorous, publication-grade inquiry. Governed by a **Fast-Path Supervisor Governor** orchestrating specialized sub-agents, ResearchBuddy advances scientific hypotheses through a governed **14-stage pipeline**:

1. **Prompt Input**: Vague or detailed mode definition by the user.
2. **Extensive Research**: Sub-agents keyword & dense retrieval with provenance tagging.
3. **Idea Surfacing**: Candidate hypotheses, cross-source contradictions, and injection defense.
4. **Idea Selection (Gate)**: Human governance gate to select and guide hypothesis.
5. **Interactive Idea Graph**: Dependency DAG visualizing connections, gaps, and risks.
6. **Mathematical Formulation**: Formal problem derivation in LaTeX with concept lineage.
7. **Algorithmic Pseudocode**: Language-agnostic formal algorithm design.
8. **Pseudocode Review (Gate)**: Human verification gate prior to implementation.
9. **Code Generation**: Real executable implementation from verified pseudocode.
10. **Sandboxed Execution**: Isolated, air-gapped container execution with resource limits.
11. **Result Check**: Automated validation against empirical metrics and baselines.
12. **Rerun Loop**: Parameter sweeps, retuning, and versioned scorecards.
13. **Architecture Gate (Gate)**: Human governance for architectural modifications & auto-rollback.
14. **Paper Generation (Final Stage)**: Camera-ready publication draft in LaTeX with citations and originality scan.

---

## ⚡ Powered by Gemma 4 (API & Local)

ResearchBuddy natively supports **Gemma 4** for both cloud and local inference:
* **Model**: Google Gemma 4 12B (`gemma4:12b` via Ollama / Gemma 4 API Key)
* **Cloud API Key**: Dedicated support for `GEMMA_API_KEY` (and `GEMMA_4_API_KEY` / Google AI Studio)
* **Hardware Acceleration**: Metal GPU Unified Memory on Apple Silicon or CUDA GPU
* **Zero Cloud Lock-in**: Run completely private and offline without token limits or toggle to cloud Gemma 4 API.

---

## 🚀 Quickstart (Hackathon Demo)

### 1. Ensure Local Ollama is Running (or configure GEMMA_API_KEY)
```bash
ollama run gemma4:12b
```

### 2. Launch Everything in 1 Click
```bash
npm run demo
```
*(or run `./start.sh`)*

This launches:
- **Backend API**: `http://localhost:8000`
- **Research Dashboard**: `http://localhost:5173`

---

## 🏗️ Architecture

```
ResearchBuddy/
├── src/
│   ├── routes/              # TanStack Start / React UI & Interactive Deck
│   ├── components/pipeline/ # Idea Graph Canvas & Metric Scorecards
│   └── lib/
│       ├── ai.server.ts     # Gemma 4 (API & Local) inference gateway
│       ├── pipeline.server.ts# 14-stage state machine & fast-path governor
│       └── supervisor.server.ts # Supervisor agent & transition planning
├── backend/
│   ├── main.py              # FastAPI microservices
│   ├── llm_engine.py        # Gemma 4 LLM runner (API & Local)
│   └── plagiarism.py        # Built-in academic novelty verifier
├── start.sh                 # One-click startup script
└── .env                     # Gemma 4 configuration
```

---

## 📜 License
MIT License. Made for Hactoberfest Hack Day x AWS SBG RTMSSU.
