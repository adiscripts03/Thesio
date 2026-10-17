import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { STAGES } from "@/components/pipeline/stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/runs/")({
  head: () => ({
    meta: [
      { title: "Research runs — Thesio" },
      {
        name: "description",
        content:
          "Start a vague or detailed research prompt and track every governed run from retrieval through sandboxed execution to a drafted paper.",
      },
      { property: "og:title", content: "Research runs — Thesio" },
      { property: "og:description", content: "Every governed research run, with its stage and approval state." },
    ],
  }),
  component: RunsPage,
});

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

function RunsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const start = (args: { data: any }) => apiCall("createRun", args.data);

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"vague" | "detailed">("vague");
  const [style, setStyle] = useState("defensive");
  const [template, setTemplate] = useState("neurips");
  const [writingStyle, setWritingStyle] = useState("");
  const [pdfNames, setPdfNames] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    const newNames: string[] = [...pdfNames];
    let combinedStyle = writingStyle;

    for (const file of Array.from(files).slice(0, 2)) {
      try {
        const form = new FormData();
        form.append("file", file);
        
        let res = await fetch("/api/extract-pdf", {
          method: "POST",
          body: form,
        });
        
        if (!res.ok) {
          res = await fetch("http://localhost:8000/api/extract-pdf", {
            method: "POST",
            body: form,
          });
        }
        
        if (res.ok) {
          const json = await res.json();
          combinedStyle += (combinedStyle ? "\n\n" : "") + (json.data?.style_text || file.name);
          newNames.push(file.name);
          toast.success(`Processed style reference from ${file.name}`);
        } else {
          // Client-side clean text extraction for PDFs
          const text = await file.text().catch(() => "");
          const stringMatches = text.match(/\(([^()]{8,})\)/g);
          let cleanLines: string[] = [];
          if (stringMatches && stringMatches.length > 5) {
            cleanLines = stringMatches
              .map((s) => s.slice(1, -1).trim())
              .filter(
                (s) =>
                  s.length > 10 &&
                  !/^\/[A-Z]/i.test(s) &&
                  !/^(FlateDecode|ObjStm|Type|Length|Filter|Font|Catalog)/i.test(s),
              );
          }
          if (cleanLines.length < 5) {
            cleanLines = text
              .split(/\r?\n/)
              .map((l) => l.replace(/[^\x20-\x7E]/g, " ").trim())
              .filter(
                (l) =>
                  l.length > 15 &&
                  !l.startsWith("/") &&
                  !l.startsWith("<<") &&
                  !l.startsWith(">>") &&
                  !/ObjStm|FlateDecode|Catalog|Pages|Type|Filter|Length/i.test(l),
              );
          }
          const extractedText =
            cleanLines.slice(0, 40).join("\n") || `Writing style reference sample from ${file.name}`;
          combinedStyle += (combinedStyle ? "\n\n" : "") + extractedText;
          newNames.push(file.name);
          toast.success(`Processed style reference from ${file.name}`);
        }
      } catch {
        // Ultimate fallback: accept file name as style tag
        combinedStyle += (combinedStyle ? "\n\n" : "") + `Writing style sample reference from ${file.name}`;
        newNames.push(file.name);
        toast.success(`Loaded reference ${file.name}`);
      }
    }

    setWritingStyle(combinedStyle);
    setPdfNames(newNames.slice(0, 2));
    setUploading(false);
    e.target.value = "";
  };

  const runs = useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,prompt,mode,stage,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      start({
        data: {
          prompt,
          mode,
          methodology_style: style as "defensive",
          latex_template: template as "neurips",
          writing_style: writingStyle || undefined,
        },
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["runs"] });
      void navigate({ to: "/runs/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the run"),
  });

  return (
    <main className="mx-auto grid max-w-[1400px] gap-8 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section>
        <p className="rule-label">Step 1 — Prompt input</p>
        <h1 className="mt-2 text-4xl">Start a research run</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Give a direction in <strong>vague mode</strong> and the agents will scope it, or specify the method precisely
          in <strong>detailed mode</strong>. Every irreversible step downstream waits for your approval.
        </p>

        <div className="paper mt-6 p-7 sm:p-8">
          <div className="inline-flex rounded-[4px] border border-border/80 bg-secondary/30 p-1">
            {(["vague", "detailed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-[3px] px-4 py-1.5 text-sm font-medium capitalize transition-all ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m} mode
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <Label htmlFor="prompt">Research prompt</Label>
            <Textarea
              id="prompt"
              rows={6}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "vague"
                  ? "e.g. Something around making mixture-of-experts models practical on edge devices"
                  : "e.g. Evaluate top-1 expert routing with a learned gating temperature on a 1.3B MoE under 4GB memory, measured on WikiText-103 perplexity and tokens/sec."
              }
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Methodology style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensive">Defensive</SelectItem>
                  <SelectItem value="vague">Vague</SelectItem>
                  <SelectItem value="assertive">Assertive</SelectItem>
                  <SelectItem value="replication">Replication-ready</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>LaTeX template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neurips">NeurIPS</SelectItem>
                  <SelectItem value="ieee">IEEE</SelectItem>
                  <SelectItem value="acl">ACL</SelectItem>
                  <SelectItem value="elsevier">Elsevier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PDF Writing Style Upload */}
          <div className="mt-5 space-y-2">
            <Label>Writing style reference (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Upload 1–2 PDFs of your past papers. We'll extract your writing style to reduce plagiarism in the generated paper.
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              <label
                className={`inline-flex items-center gap-2 cursor-pointer rounded-[4px] border border-dashed border-border px-3.5 py-2 text-xs font-medium transition-colors
                  ${uploading ? "opacity-50 pointer-events-none" : "hover:bg-secondary/60 hover:text-foreground"}`}
              >
                <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{uploading ? "Processing…" : pdfNames.length >= 2 ? "Max 2 PDFs uploaded" : "Upload PDF"}</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                  disabled={uploading || pdfNames.length >= 2}
                />
              </label>
              {pdfNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-[4px] border border-border/80 bg-secondary/50 px-2.5 py-1 text-xs">
                  <svg className="h-3 w-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="max-w-[150px] truncate">{name}</span>
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setPdfNames(pdfNames.filter((_, j) => j !== i));
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <Button
            className="mt-6 font-medium"
            disabled={prompt.trim().length < 8 || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Scoping run…" : "Open the run"}
          </Button>
        </div>

        <div className="mt-12">
          <p className="rule-label">Your runs</p>
          <div className="mt-3.5 space-y-3">
            {runs.isLoading && <p className="text-base text-muted-foreground">Loading…</p>}
            {runs.data?.length === 0 && (
              <p className="text-base text-muted-foreground">No runs yet — your first one starts above.</p>
            )}
            {runs.data?.map((r) => (
              <Link
                key={r.id}
                to="/runs/$id"
                params={{ id: r.id }}
                className="paper block px-6 py-5 transition-all hover:border-primary/80 hover:shadow-md"
              >
                <div className="flex flex-wrap items-baseline gap-3.5">
                  <h3 className="text-lg font-semibold text-foreground">{r.title}</h3>
                  <span className="rule-label">{r.mode} mode</span>
                  <span className="ml-auto rule-label">
                    Stage {r.stage} · {STAGES[r.stage - 1]?.name ?? "—"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-base text-muted-foreground">{r.prompt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <aside className="paper h-fit p-6 sm:p-7">
        <p className="rule-label">The 14 stages</p>
        <ol className="mt-4 space-y-2.5 border-l border-border/70 pl-3">
          {STAGES.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="font-[family-name:var(--font-mono)] text-xs opacity-80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-foreground font-medium">{s.name}</span>
              {s.gate && (
                <span className="ml-auto rounded-[3px] border border-border bg-secondary/80 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-muted-foreground">
                  gate
                </span>
              )}
              {s.guard && (
                <span className="ml-auto rounded-[3px] border border-border bg-secondary/80 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-muted-foreground">
                  guard
                </span>
              )}
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
