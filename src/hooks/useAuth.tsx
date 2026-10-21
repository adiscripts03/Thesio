import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let localDemo = localStorage.getItem("local_demo_user");
    if (!localDemo) {
      const defaultSession = {
        access_token: "demo_mock_jwt_token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "demo_mock_refresh_token",
        user: {
          id: "demo-user-id-001",
          aud: "authenticated",
          role: "authenticated",
          email: "demo@thesio.ai",
          user_metadata: { display_name: "Demo Researcher" },
          app_metadata: { provider: "email" },
          created_at: new Date().toISOString(),
        },
      };
      try {
        localStorage.setItem("local_demo_user", JSON.stringify(defaultSession));
        localDemo = JSON.stringify(defaultSession);
      } catch {
      }
    }
    if (localDemo) {
      try {
        const parsed = JSON.parse(localDemo);
        setSession(parsed as Session);
        setLoading(false);
      } catch {
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next) {
        setSession(next);
      } else {
        const currentLocal = localStorage.getItem("local_demo_user");
        if (currentLocal) {
          try {
            setSession(JSON.parse(currentLocal) as Session);
          } catch {
            setSession(null);
          }
        } else {
          setSession(null);
        }
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
      } else {
        const currentLocal = localStorage.getItem("local_demo_user");
        if (currentLocal) {
          try {
            setSession(JSON.parse(currentLocal) as Session);
          } catch {
          }
        }
      }
      setLoading(false);
    }).catch(() => {
      const currentLocal = localStorage.getItem("local_demo_user");
      if (currentLocal) {
        try {
          setSession(JSON.parse(currentLocal) as Session);
        } catch {
        }
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
}