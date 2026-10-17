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

**ResearchBuddy** elevates autonomous AI research from isolated script generation to rigorous, publication-grade inquiry. Governed by a **Fast-Path Supervisor Governor** orchestrating specialized sub-agents, ResearchBuddy advances scientific hypotheses through a governed **17-stage pipeline**:

1. **Literature Discovery**: Semantic search across ArXiv & academic repositories.
2. **Hypothesis Synthesis**: Novelty discovery with falsifiability scoring.
3. **Interactive Idea Graph**: Relational dependency visualization (supports, extends, contradicts).
4. **Mathematical Formulation**: Formal problem derivation in LaTeX.
5. **Algorithmic Pseudocode & Audit**: Formal specification with automated code review.
6. **Empirical Code Sandbox**: Sandboxed execution in isolated containers.
7. **Metric Scorecards**: Empirical validation with ablation and parameter sweeps.
8. **Camera-Ready LaTeX Paper**: Full 10–12 page publication paper with citations.
9. **Native Originality Verification**: In-flight novelty audit without external API bottlenecks.
10. **Institutional Memory Distillation**: Cross-run knowledge accumulation.

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
│       ├── pipeline.server.ts# 17-stage state machine & fast-path governor
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
