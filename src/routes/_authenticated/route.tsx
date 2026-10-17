import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    // Verify User Auth Session
    if (!loading && !session) {
      void navigate({ to: "/auth", search: { next: pathname } });
    }
  }, [loading, session, navigate, pathname]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="rule-label">Verifying session…</p>
      </div>
    );
  }

  return (
    <div className="grain min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3.5">
          <Link to="/runs" className="group flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-display)] text-xl font-medium tracking-tight text-foreground transition-colors group-hover:text-primary">
              Thesio
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-muted-foreground uppercase">
              STUDIO
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium tracking-wide">
            <Link
              to="/runs"
              className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold"
            >
              Runs
            </Link>
            <Link
              to="/memory"
              className="text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:font-semibold"
            >
              Strategic memory
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center rounded-[4px] border border-border/70 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
              <span className="font-[family-name:var(--font-mono)] text-[11px]">
                {session.user?.email || "researcher@thesio.ai"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={async () => {
                localStorage.removeItem("local_demo_user");
                try {
                  await supabase.auth.signOut();
                } catch {
                  // ignore
                }
                void navigate({ to: "/" });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}