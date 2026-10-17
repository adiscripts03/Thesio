import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Empty, Mono, Prose, StageCard } from "@/components/pipeline/primitives";
import { STAGES } from "@/components/pipeline/stages";
import { IdeaGraphCanvas } from "@/components/pipeline/IdeaGraphCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/runs/$id")({
  head: () => ({
    meta: [
      { title: "Run workspace — Thesio" },
      {
        name: "description",
        content:
          "Drive one research run stage by stage: firewalled retrieval, idea gates, pseudocode review, sandboxed execution, versioned reruns and paper generation.",
      },
      { property: "og:title", content: "Run workspace — Thesio" },
      { property: "og:description", content: "Stage-by-stage control of a governed AI research run." },
    ],
  }),
  component: RunWorkspace,
});

function useRunData(id: string) {
  const project = useQuery({
    queryKey: ["run", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.warn("Failed to load project:", error);
        return null;
      }
      return data;
    },
  });
  const sources = useQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .eq("project_id", id)
        .order("relevance", { ascending: false });
      if (error) {
        console.warn("Failed to load sources:", error);
        return [];
      }
      return data ?? [];
    },
  });
  const ideas = useQuery({
    queryKey: ["ideas", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ideas").select("*").eq("project_id", id).order("kind");
      if (error) {
        console.warn("Failed to load ideas:", error);
        return [];
      }
      return data ?? [];
    },
  });
  const artifacts = useQuery({
    queryKey: ["artifacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artifacts")
        .select("*")
        .eq("project_id", id)
        .order("version", { ascending: false });
      if (error) {
        console.warn("Failed to load artifacts:", error);
        return [];
      }
      return data ?? [];
    },
  });
  const versions = useQuery({
    queryKey: ["versions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiment_versions")
        .select("*")
        .eq("project_id", id)
        .order("version", { ascending: true });
      if (error) {
        console.warn("Failed to load versions:", error);
        return [];
      }
      return data ?? [];
    },
  });
  const logs = useQuery({
    queryKey: ["logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.warn("Failed to load logs:", error);
        return [];
      }
      return data ?? [];
    },
  });
  const supervisorDecisions = useQuery({
    queryKey: ["supervisor_decisions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supervisor_decisions" as any)
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data ?? [];
    },
  });
  return { project, sources, ideas, artifacts, versions, logs, supervisorDecisions };
}

async function apiCall(action: string, data: any) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const res = await fetch("/api/pipeline", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, data }),
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`API error (${res.status}): ${text.slice(0, 120)}`);
  }

  if (!res.ok || json.statusCode || json.error) {
    throw new Error(json.statusMessage || json.error || `Action ${action} failed (${res.status})`);
  }
  return json.result;
}

function RunWorkspace() {
  const { id } = useParams({ from: "/_authenticated/runs/$id" });
  const qc = useQueryClient();
  const data = useRunData(id);

  const refresh = () => {
    for (const key of ["run", "sources", "ideas", "artifacts", "versions", "logs", "supervisor_decisions"]) {
      void qc.invalidateQueries({ queryKey: [key, id] });
    }
  };

  const call = {
    research: (args: { data: { projectId: string } }) => apiCall("research", args.data),
    ideas: (args: { data: { projectId: string } }) => apiCall("ideas", args.data),
    select: (args: { data: { projectId: string; ideaId?: string; title?: string; summary?: string } }) => apiCall("select", args.data),
    ideaGraph: (args: { data: { projectId: string } }) => apiCall("ideaGraph", args.data),
    formulate: (args: { data: { projectId: string } }) => apiCall("formulate", args.data),
    pseudocode: (args: { data: { projectId: string } }) => apiCall("pseudocode", args.data),
    code: (args: { data: { projectId: string } }) => apiCall("code", args.data),
    review: (args: { data: { projectId: string; artifactId: string; status: "approved" | "rejected"; notes?: string; content?: string } }) => apiCall("review", args.data),
    execute: (args: { data: { projectId: string } }) => apiCall("execute", args.data),
    rerun: (args: { data: { projectId: string } }) => apiCall("rerun", args.data),
    propose: (args: { data: { projectId: string } }) => apiCall("propose", args.data),
    decide: (args: { data: { projectId: string; approved: boolean; change: string } }) => apiCall("decide", args.data),
    paper: (args: { data: { projectId: string } }) => apiCall("paper", args.data),
    plagiarism: (args: { data: { projectId: string } }) => apiCall("plagiarism", args.data),
    supervisorStatus: (args: { data: { projectId: string } }) => apiCall("supervisorStatus", args.data),
    supervisorAdvance: (args: { data: { projectId: string } }) => apiCall("supervisorAdvance", args.data),
  };

  const [pending, setPending] = useState<string | null>(null);
  const [ownIdea, setOwnIdea] = useState({ title: "", summary: "" });
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [proposal, setProposal] = useState<{ change: string; justification: string; risk: string } | null>(null);

  async function run<T>(key: string, fn: () => Promise<T>, success?: string) {
    setPending(key);
    try {
      const res = await fn();
      if (success) toast.success(success);
      refresh();
      return res;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return undefined;
    } finally {
      setPending(null);
    }
  }

  const project = data.project.data;
  const sources = data.sources.data ?? [];
  const ideas = data.ideas.data ?? [];
  const artifacts = data.artifacts.data ?? [];
  const versions = data.versions.data ?? [];
  const logs = data.logs.data ?? [];

  const latest = (kind: string) => artifacts.filter((a) => a.kind === kind)[0];
  const draft = latest("draft");
  const pseudo = latest("pseudocode");
  const code = latest("code");
  const paper = latest("paper");
  const selected = ideas.find((i) => i.selected);
  const flagged = sources.filter((s) => s.injection_flag);
  const lastVersion = versions[versions.length - 1];

  if (!project) {
    return <main className="mx-auto max-w-[1400px] px-6 py-16 text-sm text-muted-foreground">Loading run…</main>;
  }

  const lineage = ((draft?.meta as { lineage?: string[] } | null)?.lineage ?? []) as string[];

  return (
    <main className="mx-auto grid max-w-[1400px] gap-8 px-6 py-8 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
      {/* Stage rail */}
      <nav className="hidden h-fit lg:sticky lg:top-20 lg:block">
        <p className="rule-label">Pipeline</p>
        <ol className="mt-3 space-y-0.5 border-l border-border/70 pl-2">
          {STAGES.map((s, i) => (
            <li key={s.name}>
              <a
                href={`#stage-${i + 1}`}
                className={`group flex items-center gap-2.5 rounded-[4px] px-2.5 py-1.5 text-xs transition-all ${
                  project.stage === i + 1
                    ? "bg-primary text-primary-foreground font-medium -ml-[9px] pl-2 shadow-xs"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <span className="font-[family-name:var(--font-mono)] text-[11px] opacity-80">{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate">{s.name}</span>
                {s.gate && (
                  <span
                    className={`ml-auto rounded-[2px] px-1 py-0.2 font-[family-name:var(--font-mono)] text-[8px] font-semibold uppercase tracking-wider ${
                      project.stage === i + 1 ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground/80"
                    }`}
                    title="Human approval gate"
                  >
                    GATE
                  </span>
                )}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-6">
        <header>
          <div className="flex flex-wrap items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-wider">
            <span>{project.mode} mode</span>
            <span>·</span>
            <span>{project.methodology_style} methodology</span>
            <span>·</span>
            <span>{project.latex_template}</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{project.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground leading-relaxed">{project.prompt}</p>
        </header>

        <StageCard index={1} {...stageProps(1)} active={project.stage === 1}>
          <Prose text={project.prompt} />
        </StageCard>

        {/* 2 — Research */}
        <StageCard
          index={2}
          {...stageProps(2)}
          active={project.stage === 2}
          actions={
            <Button
              disabled={pending === "research"}
              onClick={() => run("research", () => call.research({ data: { projectId: id } }), "Retrieval complete")}
            >
              {pending === "research" ? "Sub-agents retrieving…" : sources.length ? "Re-run retrieval" : "Run retrieval"}
            </Button>
          }
        >
          {sources.length === 0 ? (
            <Empty>No sources retrieved yet.</Empty>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Chip>{sources.length} sources</Chip>
                <Chip tone="sienna">{sources.filter((s) => s.retrieval_method === "dense").length} dense-ranked</Chip>
                <Chip tone={flagged.length ? "danger" : "forest"}>{flagged.length} injection flags</Chip>
                <Chip tone="warn">all wrapped as untrusted</Chip>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {sources.map((s) => (
                  <article key={s.id} className="rounded-sm border border-border px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <a
                        href={s.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {s.title}
                      </a>
                      {s.injection_flag && <Chip tone="danger">injection</Chip>}
                    </div>
                    <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
                      {s.authors || "Unknown authors"} · {s.venue} · {s.year ?? "n.d."} · {s.retrieval_method} ·{" "}
                      rel {Number(s.relevance ?? 0).toFixed(3)} · {s.doi ? `doi:${s.doi}` : "no doi"} · retrieved{" "}
                      {new Date(s.retrieved_at).toLocaleString()}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </StageCard>

        {/* 3 — Ideas */}
        <StageCard
          index={3}
          {...stageProps(3)}
          active={project.stage === 3}
          actions={
            <Button
              disabled={pending === "ideas" || sources.length === 0}
              onClick={() => run("ideas", () => call.ideas({ data: { projectId: id } }), "Ideas surfaced")}
            >
              {pending === "ideas" ? "Synthesising…" : "Surface ideas & discrepancies"}
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="rule-label">Injection test log</p>
              {flagged.length === 0 ? (
                <Empty>No injection attempts detected in retrieved content.</Empty>
              ) : (
                <ul className="mt-2 space-y-1 text-xs">
                  {flagged.map((f) => (
                    <li key={f.id} className="rounded-sm border border-destructive/40 px-3 py-1.5">
                      <span className="font-medium">{f.title.slice(0, 90)}</span> — {f.injection_detail}. Quarantined as
                      data; not executed.
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {ideas.length === 0 ? (
              <Empty>Nothing surfaced yet.</Empty>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {ideas.map((i) => (
                  <article key={i.id} className="rounded-sm border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Chip tone={i.kind === "discrepancy" ? "warn" : "sienna"}>{i.kind}</Chip>
                      {i.requires_lab && <Chip tone="danger">lab work</Chip>}
                      {i.selected && <Chip tone="forest">selected</Chip>}
                    </div>
                    <h3 className="mt-2 text-base leading-snug">{i.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{i.summary}</p>
                    {i.rationale && <p className="mt-2 text-xs text-muted-foreground italic">{i.rationale}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </StageCard>

        {/* 4 — Selection gate */}
        <StageCard index={4} {...stageProps(4)} active={project.stage === 4}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ideas
                .filter((i) => i.kind === "idea")
                .map((i) => (
                  <Button
                    key={i.id}
                    variant={i.selected ? "default" : "outline"}
                    size="sm"
                    disabled={pending === "select"}
                    onClick={() =>
                      run("select", () => call.select({ data: { projectId: id, ideaId: i.id } }), "Idea approved")
                    }
                  >
                    {i.selected ? "Selected: " : "Follow: "}
                    {i.title.slice(0, 40)}
                  </Button>
                ))}
            </div>
            <div className="rounded-sm border border-dashed border-border p-4">
              <p className="rule-label">Or design your own</p>
              <Input
                className="mt-3"
                placeholder="Your idea title"
                value={ownIdea.title}
                onChange={(e) => setOwnIdea({ ...ownIdea, title: e.target.value })}
              />
              <Textarea
                className="mt-2"
                rows={3}
                placeholder="What it does and why it's worth trying"
                value={ownIdea.summary}
                onChange={(e) => setOwnIdea({ ...ownIdea, summary: e.target.value })}
              />
              <Button
                className="mt-3"
                size="sm"
                variant="secondary"
                disabled={ownIdea.title.trim().length < 4 || pending === "select"}
                onClick={() =>
                  run(
                    "select",
                    () =>
                      call.select({
                        data: { projectId: id, title: ownIdea.title, summary: ownIdea.summary },
                      }),
                    "Your idea is now the active direction",
                  )
                }
              >
                Use my idea
              </Button>
            </div>
          </div>
        </StageCard>

        {/* 5 — Idea Graph */}
        <StageCard
          index={5}
          {...stageProps(5)}
          active={project.stage === 5}
          actions={
            <Button
              disabled={pending === "ideaGraph" || !selected}
              onClick={() => run("ideaGraph", () => call.ideaGraph({ data: { projectId: id } }), "Idea positioning graph generated")}
            >
              {pending === "ideaGraph" ? "Mapping graph…" : latest("idea_graph") ? "Regenerate idea graph" : "Generate idea graph"}
            </Button>
          }
        >
          {(() => {
            const graphArt = latest("idea_graph");
            if (!graphArt) return <Empty>Select an idea first to map its position in the field.</Empty>;

            let parsed: any = null;
            try {
              parsed = typeof graphArt.content === "string"
                ? JSON.parse(graphArt.content)
                : graphArt.content;
            } catch {
              parsed = null;
            }

            if (!parsed || typeof parsed !== "object") {
              const displayContent = typeof graphArt.content === "object"
                ? JSON.stringify(graphArt.content, null, 2)
                : String(graphArt.content ?? "");
              return <Mono>{displayContent}</Mono>;
            }

            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-secondary/30 p-3">
                  <div>
                    <p className="rule-label">Graph Network</p>
                    <p className="mt-1 text-xs font-mono text-muted-foreground">
                      {parsed.nodes?.length ?? 0} nodes · {parsed.edges?.length ?? 0} relationship edges
                    </p>
                  </div>
                </div>

                {parsed.positioning_summary && (
                  <div>
                    <p className="rule-label">Field Positioning Summary</p>
                    <p className="mt-1 text-xs text-foreground leading-relaxed">{parsed.positioning_summary}</p>
                  </div>
                )}

                {/* Interactive Visual Graph Canvas */}
                {parsed.nodes && parsed.edges && (
                  <div>
                    <p className="rule-label mb-2">Interactive Idea Positioning Graph</p>
                    <IdeaGraphCanvas nodesData={parsed.nodes} edgesData={parsed.edges} />
                  </div>
                )}

                {parsed.gap_analysis && (
                  <div className="rounded-sm border border-forest/40 p-3 bg-forest/5">
                    <p className="rule-label text-forest">Identified Field Gaps</p>
                    <p className="mt-1 text-xs">{parsed.gap_analysis}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </StageCard>

        {/* 6 — Formulation */}
        <StageCard
          index={6}
          {...stageProps(6)}
          active={project.stage === 6}
          actions={
            <Button
              disabled={pending === "formulate" || !selected}
              onClick={() => run("formulate", () => call.formulate({ data: { projectId: id } }), "Formulation drafted")}
            >
              {pending === "formulate" ? "Drafting…" : draft ? "Redraft" : "Formulate idea"}
            </Button>
          }
        >
          {!draft ? (
            <Empty>No formulation yet.</Empty>
          ) : (
            <div className="space-y-4">
              {lineage.length > 0 && (
                <div>
                  <p className="rule-label">Concept lineage</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {lineage.map((c, idx) => (
                      <span key={c} className="flex items-center gap-2">
                        <Chip tone="sienna">{c}</Chip>
                        {idx < lineage.length - 1 && <span className="text-muted-foreground">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <Prose text={draft.content} />
            </div>
          )}
        </StageCard>

        {/* 7 & 8 — Pseudocode */}
        <StageCard
          index={7}
          {...stageProps(7)}
          active={project.stage === 7}
          actions={
            <Button
              disabled={pending === "pseudo" || !draft}
              onClick={() => run("pseudo", () => call.pseudocode({ data: { projectId: id } }), "Pseudocode generated")}
            >
              {pending === "pseudo" ? "Writing…" : pseudo ? "Regenerate pseudocode" : "Generate pseudocode"}
            </Button>
          }
        >
          {pseudo ? <Mono>{pseudo.content}</Mono> : <Empty>No pseudocode yet.</Empty>}
        </StageCard>

        <ReviewStage
          index={8}
          artifact={pseudo}
          active={project.stage === 8}
          editing={editing}
          setEditing={setEditing}
          pending={pending === "review-pseudo"}
          onReview={(status, content) =>
            run(
              "review-pseudo",
              () =>
                call.review({
                  data: {
                    projectId: id,
                    artifactId: pseudo!.id,
                    status,
                    ...(content !== undefined ? { content } : {}),
                  },
                }),
              `Pseudocode ${status}`,
            )
          }
        />

        {/* 9 & 10 — Code */}
        <StageCard
          index={9}
          {...stageProps(9)}
          active={project.stage === 9}
          actions={
            <Button
              disabled={pending === "code" || pseudo?.status !== "approved"}
              onClick={() => run("code", () => call.code({ data: { projectId: id } }), "Implementation generated")}
            >
              {pending === "code" ? "Implementing…" : code ? "Regenerate code" : "Generate real code"}
            </Button>
          }
        >
          {code ? <Mono>{code.content}</Mono> : <Empty>Approve the pseudocode to unlock code generation.</Empty>}
        </StageCard>

        {/* 10 — Sandboxed Execution */}
        <StageCard
          index={10}
          {...stageProps(10)}
          active={project.stage === 10}
          actions={
            <Button
              disabled={pending === "execute" || !code}
              onClick={() => run("execute", () => call.execute({ data: { projectId: id } }), "Execution finished")}
            >
              {pending === "execute" ? "Running in sandbox…" : "Execute autonomously"}
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            <Chip tone="warn">network denied</Chip>
            <Chip tone="warn">2 vCPU / 4 GB</Chip>
            <Chip tone="warn">900s wall clock</Chip>
            <Chip tone="warn">disposable session</Chip>
          </div>
          {lastVersion?.logs && (
            <div className="mt-4">
              <p className="rule-label">stdout — v{lastVersion.version}</p>
              <div className="mt-2">
                <Mono>{lastVersion.logs}</Mono>
              </div>
            </div>
          )}
        </StageCard>

        {/* 11 — Results */}
        <StageCard index={11} {...stageProps(11)} active={project.stage === 11}>
          {versions.length === 0 ? (
            <Empty>No results yet.</Empty>
          ) : (
            <div className="space-y-3">
              {versions.map((v) => {
                const metricsObj = (typeof v.metrics === "object" && v.metrics !== null ? v.metrics : {}) as Record<string, unknown>;
                const configObj = (typeof v.config === "object" && v.config !== null ? v.config : {}) as Record<string, unknown>;
                
                const modelName = String(configObj.model || configObj.model_type || configObj.algorithm || "ML / PyTorch Model");

                return (
                  <article key={v.id} className="paper rounded-md border border-border p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip tone="sienna">v{v.version}</Chip>
                      <span className="font-semibold text-sm">{v.label || `Experiment Version ${v.version}`}</span>
                      <Chip tone={v.verdict === "good" ? "forest" : "danger"}>{v.verdict}</Chip>
                      <Chip tone="muted">{modelName}</Chip>
                      {v.architecture_change && <Chip tone="warn">architecture revision</Chip>}
                      {v.rolled_back && <Chip tone="danger">rolled back</Chip>}
                      <span className="ml-auto font-mono text-xs font-bold text-muted-foreground">
                        Overall Score: {Number(v.score ?? 0).toFixed(3)}
                      </span>
                    </div>

                    {Object.keys(metricsObj).length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 pt-1">
                        {Object.entries(metricsObj).map(([key, val]) => {
                          const numVal = typeof val === "number" ? val : Number(val);
                          const formattedVal = !isNaN(numVal) 
                            ? numVal <= 1 && numVal > 0 
                              ? `${(numVal * 100).toFixed(2)}%` 
                              : numVal.toFixed(4)
                            : String(val);

                          return (
                            <div key={key} className="rounded-sm border border-border bg-secondary/40 px-3 py-2">
                              <p className="rule-label truncate">{key.replace(/_/g, " ")}</p>
                              <p className="mt-1 font-mono text-sm font-semibold">{formattedVal}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {Object.keys(configObj).length > 0 && (
                      <div className="pt-1">
                        <p className="rule-label">Hyperparameters & Configuration</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px]">
                          {Object.entries(configObj).map(([k, val]) => (
                            <span key={k} className="rounded-sm border border-border bg-background px-2 py-0.5 text-muted-foreground">
                              <span className="font-medium text-foreground">{k}:</span> {JSON.stringify(val)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {v.rollback_reason && <p className="mt-1 text-xs text-destructive">{v.rollback_reason}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </StageCard>

        {/* 12 — Rerun Loop */}
        <StageCard
          index={12}
          {...stageProps(12)}
          active={project.stage === 12}
          actions={
            <Button
              variant="secondary"
              disabled={pending === "rerun" || versions.length === 0}
              onClick={() => run("rerun", () => call.rerun({ data: { projectId: id } }), "Rerun complete")}
            >
              {pending === "rerun" ? "Retuning…" : "Rerun with new hyperparameters"}
            </Button>
          }
        >
          <Empty>Each rerun is stored as its own version with a scorecard — nothing is overwritten.</Empty>
        </StageCard>

        {/* 13 — Architecture Gate */}
        <StageCard
          index={13}
          {...stageProps(13)}
          active={project.stage === 13}
          actions={
            <Button
              variant="outline"
              disabled={pending === "propose" || versions.length === 0}
              onClick={async () => {
                const res = await run("propose", () => call.propose({ data: { projectId: id } }));
                if (res) setProposal(res);
              }}
            >
              {pending === "propose" ? "Analysing…" : "Propose architecture change"}
            </Button>
          }
        >
          {!proposal ? (
            <Empty>No architectural change is on the table.</Empty>
          ) : (
            <div className="space-y-3 rounded-sm border border-warn/50 p-4">
              <p className="text-sm">
                <strong>Architecture needs modification — proceed?</strong>
              </p>
              <Prose text={`${proposal.change}\n\nJustification: ${proposal.justification}\n\nRisk: ${proposal.risk}`} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending === "decide"}
                  onClick={() =>
                    run(
                      "decide",
                      () =>
                        call.decide({ data: { projectId: id, approved: true, change: proposal.change } }),
                      "Architecture revision executed",
                    ).then(() => setProposal(null))
                  }
                >
                  Yes, proceed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending === "decide"}
                  onClick={() =>
                    run("decide", () =>
                      call.decide({ data: { projectId: id, approved: false, change: proposal.change } }),
                    ).then(() => setProposal(null))
                  }
                >
                  No, keep retuning
                </Button>
              </div>
            </div>
          )}
        </StageCard>

        {/* 14 — Paper (Final Stage) */}
        <StageCard
          index={14}
          {...stageProps(14)}
          active={project.stage === 14}
          actions={
            <>
              <Button
                disabled={pending === "paper"}
                onClick={() => run("paper", () => call.paper({ data: { projectId: id } }), "Paper drafted")}
              >
                {pending === "paper" ? "Writing paper…" : "Generate paper"}
              </Button>
              {paper && (
                <>
                  <Button
                    variant="secondary"
                    disabled={pending === "plagiarism"}
                    onClick={() => run("plagiarism", () => call.plagiarism({ data: { projectId: id } }), "Plagiarism check complete")}
                  >
                    {pending === "plagiarism" ? "Scanning GoWinston AI…" : "Scan Plagiarism (GoWinston AI)"}
                  </Button>
                  <Button variant="outline" onClick={() => downloadTex(project.title, paper.content)}>
                    Download .tex
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending === "downloadPdf"}
                    onClick={async () => {
                      setPending("downloadPdf");
                      try {
                        await downloadPdf(project.title, paper.content);
                        toast.success("PDF downloaded successfully");
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to compile PDF");
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    {pending === "downloadPdf" ? "Compiling PDF…" : "Download .pdf"}
                  </Button>
                </>
              )}
            </>
          }
        >
          {paper ? (
            <div className="space-y-6">
              <Mono>{paper.content}</Mono>

              {/* Plagiarism Analysis Report from GoWinston AI */}
              {(() => {
                const plag = (paper.meta as { plagiarism?: Record<string, unknown> } | null)?.plagiarism;
                if (!plag) return null;

                if (!plag.success) {
                  return (
                    <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-xs">
                      <p className="font-semibold text-destructive">Plagiarism Check Notice</p>
                      <p className="mt-1 text-muted-foreground">
                        {String(plag.error || "Unable to reach GoWinston AI plagiarism service. The paper remains complete.")}
                      </p>
                    </div>
                  );
                }

                // Handle score normalization (GoWinston can return 0.0-1.0 or 0-100)
                let rawScore = Number(plag.score ?? 0);
                if (rawScore <= 1 && rawScore > 0) rawScore = rawScore * 100;
                const plagPercent = Math.min(100, Math.max(0, Math.round(rawScore)));
                const originalityPercent = 100 - plagPercent;

                const tone = originalityPercent >= 80 ? "forest" : originalityPercent >= 50 ? "warn" : "danger";
                const toneColor = tone === "forest" ? "text-forest" : tone === "warn" ? "text-warn" : "text-destructive";
                const strokeColor = tone === "forest" ? "#22c55e" : tone === "warn" ? "#eab308" : "#ef4444";

                const sources = Array.isArray(plag.sources) ? plag.sources : [];

                return (
                  <div className="paper rounded-md border border-border p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">GoWinston AI Plagiarism Report</h3>
                          <Chip tone={tone}>
                            {originalityPercent >= 80 ? "Pass • Highly Original" : originalityPercent >= 50 ? "Review Needed" : "High Risk"}
                          </Chip>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Scanned against 400B+ web pages, journals, and databases
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 items-center">
                      {/* Visual Circular Gauge */}
                      <div className="flex items-center gap-4 rounded-sm border border-border bg-secondary/30 p-3">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 36 36">
                            <path
                              className="text-border"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              strokeWidth="3.5"
                              strokeDasharray={`${originalityPercent}, 100`}
                              strokeLinecap="round"
                              stroke={strokeColor}
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <span className={`absolute text-sm font-bold ${toneColor}`}>
                            {originalityPercent}%
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium">Originality Score</p>
                          <p className="text-[11px] text-muted-foreground">
                            {plagPercent}% similarity detected
                          </p>
                        </div>
                      </div>

                      {/* Stat 2: Matched Sources */}
                      <div className="rounded-sm border border-border bg-secondary/30 p-3">
                        <p className="rule-label">Matched Sources</p>
                        <p className="mt-1 text-xl font-bold">{sources.length}</p>
                        <p className="text-[11px] text-muted-foreground">External overlaps found</p>
                      </div>

                      {/* Stat 3: Verification */}
                      <div className="rounded-sm border border-border bg-secondary/30 p-3">
                        <p className="rule-label">Verification Engine</p>
                        <p className="mt-1 text-sm font-semibold">GoWinston AI v2</p>
                        <p className="text-[11px] text-forest font-medium">✓ Scanned & Verified</p>
                      </div>
                    </div>

                    {/* Matched Sources List */}
                    {sources.length > 0 && (
                      <div className="mt-4 space-y-2 pt-2">
                        <p className="rule-label">Overlapping Literature / Web Sources</p>
                        <div className="max-h-40 space-y-1.5 overflow-auto pr-1">
                          {sources.map((src: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-sm border border-border px-3 py-1.5 text-xs"
                            >
                              <a
                                href={src.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate font-medium hover:underline text-foreground/90 max-w-[80%]"
                              >
                                {src.title || src.url || `Matched Source #${idx + 1}`}
                              </a>
                              <span className="font-mono text-[11px] font-semibold text-warn">
                                {Math.round(Number(src.similarity || src.score || 0) * (Number(src.similarity) <= 1 ? 100 : 1))}% match
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <Empty>A good result unlocks paper generation.</Empty>
          )}
        </StageCard>
      </div>

      {/* Sidebar: Supervisor Control & Audit Log */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-20">
        <div className="paper p-4">
          <div className="flex items-center justify-between">
            <p className="rule-label font-semibold text-foreground">Autonomous Supervisor</p>
            <Chip tone="muted">Active</Chip>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Oversees 11 sub-agents, checks data parameters, fixes bugs, and auto-advances non-gate stages.
          </p>
          <Button
            className="mt-3.5 w-full text-xs font-medium"
            size="sm"
            disabled={pending === "supervisor"}
            onClick={async () => {
              const res = await run("supervisor", () => call.supervisorAdvance({ data: { projectId: id } }));
              if (res) {
                if (res.advanced) {
                  toast.success(`Supervisor advanced stage to ${res.toStage}`);
                } else if (res.waitingForHuman) {
                  toast.info(res.reasoning || "Waiting for human approval at this gate.");
                } else {
                  toast.warning(res.reasoning || "Supervisor held the pipeline.");
                }
              }
            }}
          >
            {pending === "supervisor" ? "Evaluating pipeline…" : "Auto-advance pipeline"}
          </Button>
        </div>

        <div className="paper p-4">
          <p className="rule-label">Audit log & Governance</p>
          <div className="mt-3 max-h-[70vh] space-y-2 overflow-auto pr-1">
            {logs.length === 0 && <Empty>Nothing logged yet.</Empty>}
            {logs.map((l) => (
              <div
                key={l.id}
                className={`border-l-2 pl-2.5 py-1 text-xs transition-colors ${
                  l.severity === "warn"
                    ? "border-amber-500/60 bg-amber-500/5"
                    : l.severity === "gate"
                      ? "border-foreground/40 bg-secondary/30"
                      : "border-border/80"
                }`}
              >
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleTimeString()} · {l.actor} · stage {l.stage}
                </p>
                <p className="mt-0.5 leading-snug text-foreground/90">{l.event}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}

function stageProps(index: number) {
  const s = STAGES[index - 1]!;
  return { title: s.name, blurb: s.blurb, gate: s.gate, guard: s.guard };
}

type Artifact = {
  id: string;
  kind: string;
  version: number;
  content: string;
  status: string;
  review_notes: string | null;
};

function ReviewStage({
  index,
  artifact,
  active,
  editing,
  setEditing,
  pending,
  onReview,
}: {
  index: number;
  artifact: Artifact | undefined;
  active: boolean;
  editing: Record<string, string>;
  setEditing: (v: Record<string, string>) => void;
  pending: boolean;
  onReview: (status: "approved" | "rejected", content?: string) => void;
}) {
  const s = STAGES[index - 1]!;
  const value = artifact ? (editing[artifact.id] ?? artifact.content) : "";
  const dirty = artifact ? value !== artifact.content : false;

  return (
    <StageCard
      index={index}
      title={s.name}
      blurb={s.blurb}
      gate={s.gate}
      guard={s.guard}
      active={active}
      actions={
        artifact ? (
          <>
            <Button
              disabled={pending}
              onClick={() => onReview("approved", dirty ? value : undefined)}
            >
              {dirty ? "Save edits & approve" : "Approve"}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => onReview("rejected")}>
              Reject
            </Button>
          </>
        ) : undefined
      }
    >
      {!artifact ? (
        <Empty>Nothing to review yet.</Empty>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Chip tone="sienna">v{artifact.version}</Chip>
            <Chip tone={artifact.status === "approved" ? "forest" : artifact.status === "rejected" ? "danger" : "muted"}>
              {artifact.status}
            </Chip>
          </div>
          <Textarea
            rows={12}
            className="font-[family-name:var(--font-mono)] text-xs"
            value={value}
            onChange={(e) => setEditing({ ...editing, [artifact.id]: e.target.value })}
          />
        </div>
      )}
    </StageCard>
  );
}

function downloadTex(title: string, content: string) {
  const blob = new Blob([content], { type: "application/x-tex" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.tex`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(title: string, content: string) {
  const res = await apiCall("compilePdf", { title, content });
  if (!res?.pdfBase64) throw new Error("No PDF data returned from compiler.");
  
  const byteCharacters = atob(res.pdfBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
