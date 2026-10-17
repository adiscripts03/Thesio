import type { ReactNode } from "react";

export function StageCard({
  index,
  title,
  blurb,
  gate,
  guard,
  active,
  children,
  actions,
}: {
  index: number;
  title: string;
  blurb: string;
  gate?: boolean | undefined;
  guard?: boolean | undefined;
  active?: boolean | undefined;
  children?: ReactNode | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <section
      id={`stage-${index}`}
      className={`paper scroll-mt-24 p-7 sm:p-8 transition-all duration-150 ${
        active
          ? "border-primary ring-2 ring-primary/25 shadow-lg"
          : "hover:border-border hover:shadow-sm"
      }`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border/80 bg-secondary/70 font-[family-name:var(--font-mono)] text-xs font-semibold text-foreground">
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl leading-tight font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1.5 text-base text-muted-foreground leading-relaxed">{blurb}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {gate && <Chip tone="forest">Human gate</Chip>}
          {guard && <Chip tone="warn">Guardrail</Chip>}
        </div>
      </div>
      {children && <div className="mt-6">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
    </section>
  );
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "forest" | "warn" | "sienna" | "danger" | undefined;
}) {
  const tones: Record<string, string> = {
    muted: "border-border/80 bg-secondary/60 text-muted-foreground",
    forest: "border-border/80 bg-secondary/80 text-foreground font-medium",
    warn: "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium",
    sienna: "border-border bg-secondary/80 text-foreground font-medium",
    danger: "border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-medium",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[5px] border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  const safe =
    typeof children === "object" && children !== null && !Array.isArray(children) && !("$$typeof" in (children as any))
      ? JSON.stringify(children, null, 2)
      : children;
  return (
    <pre className="max-h-[460px] overflow-auto rounded-[6px] border border-border/80 bg-secondary/40 p-5 font-[family-name:var(--font-mono)] text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
      {safe}
    </pre>
  );
}

export function Prose({ text }: { text: string | Record<string, unknown> }) {
  const safe = typeof text === "object" && text !== null ? JSON.stringify(text, null, 2) : String(text ?? "");
  return (
    <div className="max-h-[460px] overflow-auto text-base leading-relaxed whitespace-pre-wrap text-foreground/90 font-normal">
      {safe}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[6px] border border-dashed border-border/70 bg-secondary/20 px-5 py-4 text-center text-sm text-muted-foreground italic">
      {children}
    </div>
  );
}