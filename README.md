# 🔬 ResearchBuddy

> **Autonomous Scientific Research Operating System powered by Local Gemma 4 12B**  
> *Built for high-throughput, private, offline-capable multi-agent academic research.*

[![Local Inference](https://img.shields.io/badge/Inference-Gemma_4_12B_(Local)-4285F4.svg)](#)
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

## ⚡ Powered by Local Gemma 4 12B

ResearchBuddy runs **100% locally and privately**:
* **Model**: Google Gemma 4 12B (`gemma4:12b` via Ollama)
* **Hardware Acceleration**: Metal GPU Unified Memory on Apple Silicon
* **Zero Cloud Lock-in**: No rate limits, zero API credit costs, and complete research confidentiality.
* **Dual-Mode**: Seamlessly toggles to Groq LPU if cloud bursting is desired.

---

## 🚀 Quickstart (Hackathon Demo)

### 1. Ensure Ollama is Running
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
│       ├── ai.server.ts     # Local Gemma 12B & Groq inference gateway
│       ├── pipeline.server.ts# 17-stage state machine & fast-path governor
│       └── supervisor.server.ts # Supervisor agent & transition planning
├── backend/
│   ├── main.py              # FastAPI microservices
│   ├── llm_engine.py        # Local & cloud LLM runner
│   └── plagiarism.py        # Built-in academic novelty verifier
├── start.sh                 # One-click startup script
└── .env                     # Local Gemma 12B configuration
```

---

## 📜 License
MIT License. Built for Innohacks 4.0.
