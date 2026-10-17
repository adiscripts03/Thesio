# 🔬 Thesio

> **Governed Autonomous AI Research Studio powered by Gemma 4 & Groq**  
> *Made for Hacktoberfest Hack Day x AWS SBG RTMSSU*

[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-Hack_Day_x_AWS_SBG_RTMSSU-FF8800.svg)](#)
[![Inference](https://img.shields.io/badge/Inference-Gemma_4_%26_Groq-4285F4.svg)](#)
[![Apple Silicon Metal](https://img.shields.io/badge/Acceleration-Metal_GPU-000000.svg)](#)
[![TypeScript](https://img.shields.io/badge/Stack-TypeScript_%7C_Python_%7C_React-blue.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#)

---

## 🌟 Overview

**Thesio** elevates autonomous AI research from isolated script generation to rigorous, publication-grade inquiry. Governed by a **Fast-Path Supervisor Governor** orchestrating specialized sub-agents, Thesio advances scientific hypotheses through a governed **14-stage pipeline**:

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

## ⚡ Powered by Gemma 4 (API & Local) & Groq Cloud

Thesio natively supports **Gemma 4** (local via Ollama) and **Groq** for high-speed cloud inference:
* **Local Model**: Google Gemma 4 12B (`gemma4:12b` via Ollama / Metal GPU Unified Memory)
* **Cloud API**: Dedicated Groq API support (`llama-3.3-70b-versatile`) with Gemini fallback
* **Hardware Acceleration**: Metal GPU Unified Memory on Apple Silicon or CUDA GPU
* **Zero Cloud Lock-in**: Run completely private and offline without token limits or toggle to cloud APIs.

---

## 🚀 Quickstart (Hackathon Demo)

### 1. Ensure Local Ollama is Running (or configure GROQ_API_KEY)
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
- **Thesio Dashboard**: `http://localhost:5173`

---

## 🏗️ Architecture

```
Thesio/
├── src/
│   ├── routes/              # TanStack Start / React UI & Interactive Deck
│   ├── components/pipeline/ # Idea Graph Canvas & Metric Scorecards
│   └── lib/
│       ├── ai.server.ts     # Multi-provider (Gemma 4 Local / Groq / Gemini) gateway
│       ├── pipeline.server.ts# 14-stage state machine & fast-path governor
│       └── supervisor.server.ts # Supervisor agent & transition planning
├── backend/
│   ├── main.py              # FastAPI microservices
│   ├── llm_engine.py        # Multi-provider LLM runner (Local Ollama / Groq / Gemini)
│   └── plagiarism.py        # Built-in academic novelty verifier
├── start.sh                 # One-click startup script
└── .env                     # Configuration
```

---

## 📜 License
MIT License. Made for Hacktoberfest Hack Day x AWS SBG RTMSSU.
