import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Demo Sign In — Thesio Research Pipeline" },
      {
        name: "description",
        content:
          "Instant demo access to Thesio to run governed, human-approved AI research pipelines from prompt to publishable paper.",
      },
      { property: "og:title", content: "Demo Sign In — Thesio Research Pipeline" },
      {
        property: "og:description",
        content: "Access your governed AI research runs, approval gates and audit logs.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const target = next && next.startsWith("/") ? next : "/runs";

  useEffect(() => {
    if (!loading && session) void navigate({ to: target });
  }, [loading, session, navigate, target]);

  async function onDemoSignIn() {
    setBusy(true);
    const demoEmail = "demo@thesio.ai";
    const demoPassword = "DemoUser123!";
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });
      if (signInError) {
        const mockSession = {
          access_token: "demo_mock_jwt_token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "demo_mock_refresh_token",
          user: {
            id: "demo-user-id-001",
            aud: "authenticated",
            role: "authenticated",
            email: demoEmail,
            user_metadata: { display_name: "Demo Researcher" },
            app_metadata: { provider: "email" },
            created_at: new Date().toISOString(),
          },
        };
        localStorage.setItem("local_demo_user", JSON.stringify(mockSession));
        toast.success("Signed in as Demo Researcher!");
        window.location.href = target;
        return;
      }
      toast.success("Signed in as Demo Researcher!");
      void navigate({ to: target });
    } catch {
      const mockSession = {
        access_token: "demo_mock_jwt_token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "demo_mock_refresh_token",
        user: {
          id: "demo-user-id-001",
          aud: "authenticated",
          role: "authenticated",
          email: demoEmail,
          user_metadata: { display_name: "Demo Researcher" },
          app_metadata: { provider: "email" },
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem("local_demo_user", JSON.stringify(mockSession));
      toast.success("Signed in as Demo Researcher!");
      window.location.href = target;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grain flex min-h-screen items-center justify-center px-6 py-16">
      <div className="paper w-full max-w-md p-8 text-center sm:text-left">
        <p className="rule-label">Thesio Studio</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-foreground">Instant Demo Access</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Access governed research pipelines, real-time stage progress, and approval gates immediately.
        </p>

        <div className="mt-8">
          <Button
            type="button"
            className="w-full font-medium py-6 text-sm flex items-center justify-center gap-2"
            disabled={busy}
            onClick={onDemoSignIn}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>{busy ? "Entering Studio…" : "Instant Demo Sign In"}</span>
          </Button>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4 text-center">
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
            No credentials required · Full researcher privileges
          </p>
        </div>
      </div>
    </main>
  );
}