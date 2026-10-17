import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { STAGES } from "@/components/pipeline/stages";
import { Chip } from "@/components/pipeline/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Thesio — Governed Autonomous Research Pipeline" },
      {
        name: "description",
        content:
          "From a vague hunch to a drafted empirical paper: firewalled literature retrieval, human gates on ideas and code, sandboxed execution, and versioned reruns with rollback.",
      },
      { property: "og:title", content: "Thesio — Governed Autonomous Research Pipeline" },
      {
        property: "og:description",
        content:
          "Autonomous scientific inquiry kept strictly bounded by provenance firewalls, isolated execution, and human approval gates.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [filter, setFilter] = useState<"all" | "gates" | "guards">("all");

  const filteredStages = STAGES.filter((s) => {
    if (filter === "gates") return s.gate;
    if (filter === "guards") return s.guard;
    return true;
  });

  return (
    <div className="grain min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5">
          <Link to="/" className="group flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-muted-foreground">
              Thesio
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-muted-foreground uppercase">
              STUDIO
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              to="/runs"
              className="rounded-[4px] bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/70 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            {/* Left copy */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3.5 py-1 text-[11px] font-medium text-orange-400">
                <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Hacktoberfest Hack Day x AWS SBG RTMSSU · Powered by Gemma 4</span>
              </div>
              <h1 className="text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
                From a vague hunch to an empirical, drafted manuscript.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
                Seventeen autonomous sub-agents synthesize literature, formulate formal hypotheses, and benchmark
                implementations — kept on an uncompromising leash with untrusted data firewalls and human gates at every irreversible step.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/runs"
                  className="inline-flex items-center gap-2 rounded-[4px] bg-primary px-5 py-2.5 text-xs font-medium tracking-wide text-primary-foreground shadow-xs transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <span>Open workspace</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {/* Trust markers */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/70 pt-6 text-left">
                <div>
                  <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-foreground">17</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Sequential stages</div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-foreground">3 Gates</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Mandatory human reviews</div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-mono)] text-xl font-semibold text-foreground">100%</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Sandbox air-gapped</div>
                </div>
              </div>
            </div>

            {/* Right preview artifact */}
            <div className="relative">
              <div className="paper overflow-hidden p-6 shadow-md border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-foreground">
                      RUN #842
                    </span>
                    <span className="rounded-[3px] border border-border bg-secondary/80 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-muted-foreground">
                      Active
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-muted-foreground">
                    Defensive Mode
                  </span>
                </div>

                <div className="mt-4 space-y-3.5">
                  <div>
                    <span className="rule-label">Core Hypothesis</span>
                    <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">
                      Learned routing temperatures on 1.3B MoE edge weights under 4GB RAM ceiling
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[4px] border border-border bg-secondary/40 p-2.5">
                      <span className="text-[10px] text-muted-foreground">Literature Scanned</span>
                      <p className="mt-1 font-[family-name:var(--font-mono)] font-semibold text-foreground">
                        28 papers (0 injections)
                      </p>
                    </div>
                    <div className="rounded-[4px] border border-border bg-secondary/40 p-2.5">
                      <span className="text-[10px] text-muted-foreground">Execution Sandbox</span>
                      <p className="mt-1 font-[family-name:var(--font-mono)] font-semibold text-foreground">
                        Air-gapped (0 egress)
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[4px] border border-border bg-secondary/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Stage 08 · Pseudocode Gate</span>
                      <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-muted-foreground">
                        Awaiting Approval
                      </span>
                    </div>
                    <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground line-clamp-2">
                      def route_experts(tokens, gate_weights, tau=0.85): ...
                    </p>
                  </div>

                  <div className="border-t border-border/70 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Supervisor: Autonomous monitoring</span>
                    <span className="font-[family-name:var(--font-mono)]">Latency: 184ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Foundations */}
      <section id="architecture" className="py-20 border-b border-border/70">
        <div className="mx-auto max-w-6xl px-6">
          <p className="rule-label text-muted-foreground">Foundational Pillars</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Strict boundaries where probabilistic models cannot fail silently.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
            Standard AI pipelines hallucinate sources, generate unverified code, and execute unsafe loops. Thesio binds
            sub-agents within formal cryptographic and human-review constraints.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="paper p-6 transition-all hover:border-primary/80 hover:shadow-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border/80 bg-secondary font-[family-name:var(--font-mono)] text-xs font-semibold text-foreground">
                01
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Untrusted Provenance Firewall</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                All retrieved literature from semantic repositories passes through an isolated parser. Any embedded
                adversarial injections are quarantined strictly as data and prevented from polluting sub-agent reasoning.
              </p>
            </div>

            <div className="paper p-6 transition-all hover:border-primary/80 hover:shadow-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border/80 bg-secondary font-[family-name:var(--font-mono)] text-xs font-semibold text-foreground">
                02
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Triple Human-in-the-Loop Gates</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Irreversible transitions halt automatically: Idea Selection, Pseudocode Review, and
                Architecture Mutation require your explicit verification before proceeding.
              </p>
            </div>

            <div className="paper p-6 transition-all hover:border-primary/80 hover:shadow-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border/80 bg-secondary font-[family-name:var(--font-mono)] text-xs font-semibold text-foreground">
                03
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Network-Denied Sandbox Runtime</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Experiment code executes inside resource-limited, network-denied container environments. Every command,
                dependency installation, and console stdout is recorded in an immutable audit ledger.
              </p>
            </div>

            <div className="paper p-6 transition-all hover:border-primary/80 hover:shadow-md">
              <span className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-border/80 bg-secondary font-[family-name:var(--font-mono)] text-xs font-semibold text-foreground">
                04
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Differential Reruns & Strategic Memory</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Iterative runs are benchmarked version-by-version. Regressions trigger automatic rollback, while durable
                empirical findings are distilled into decay-weighted long-term organizational memory.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 16 Stages Interactive Overview */}
      <section id="stages" className="py-20 border-b border-border/70">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="rule-label">Sequential Execution</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                The 17 Governed Stages
              </h2>
            </div>
            <div className="inline-flex rounded-[4px] border border-border bg-secondary/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-[3px] px-3 py-1 font-medium capitalize transition-all ${
                  filter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All (17)
              </button>
              <button
                type="button"
                onClick={() => setFilter("gates")}
                className={`rounded-[3px] px-3 py-1 font-medium capitalize transition-all ${
                  filter === "gates" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Human gates (4)
              </button>
              <button
                type="button"
                onClick={() => setFilter("guards")}
                className={`rounded-[3px] px-3 py-1 font-medium capitalize transition-all ${
                  filter === "guards" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Guardrails (5)
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredStages.map((s) => {
              const originalIndex = STAGES.findIndex((item) => item.name === s.name) + 1;
              return (
                <div
                  key={s.name}
                  className="paper flex flex-col justify-between p-4 transition-all hover:border-primary/80 hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold text-muted-foreground">
                        {String(originalIndex).padStart(2, "0")}
                      </span>
                      <div className="flex gap-1.5">
                        {s.gate && <Chip tone="forest">Gate</Chip>}
                        {s.guard && <Chip tone="warn">Guard</Chip>}
                      </div>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-foreground">{s.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.blurb}</p>
                  </div>
                  <div className="mt-3 border-t border-border/60 pt-2 font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
                    Agent: {s.agent || "pipeline"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ready Call To Action */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Begin your next empirical inquiry.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Enter a prompt, specify your methodology style, and observe 17 sub-agents synthesize literature and draft code
            under strict human supervision.
          </p>
          <div className="mt-8 flex justify-center gap-3.5">
            <Link
              to="/runs"
              className="inline-flex items-center gap-2 rounded-[4px] bg-primary px-6 py-2.5 text-xs font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
            >
              Open workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/70 bg-card/60 py-6 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Thesio</span>
            <span>· Governed Autonomous Research Studio</span>
          </div>
          <div className="flex items-center gap-4 font-[family-name:var(--font-mono)] text-[10px]">
            <span className="text-orange-400/90 font-medium">Hacktoberfest Hack Day x AWS SBG RTMSSU</span>
            <span>Gemma 4 Engine</span>
            <span>Version 4.0.2</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
