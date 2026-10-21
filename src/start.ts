import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { handlePipelineAction } from "./lib/pipeline.server";
import { handlePostgRestRequest } from "./lib/local-db";

const apiMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/api/pipeline") {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    if (request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const result = await handlePipelineAction(body, request);
        return new Response(JSON.stringify({ ok: true, result }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err: any) {
        console.error("[start] pipeline action error:", err);
        return new Response(
          JSON.stringify({ error: err?.message || String(err), detail: String(err) }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }
  }

  if (pathname.startsWith("/rest/v1/") || pathname.startsWith("/api/rest/")) {
    try {
      const body = request.method !== "GET" && request.method !== "HEAD"
        ? await request.json().catch(() => undefined)
        : undefined;
      const headersObj: Record<string, string> = {};
      request.headers.forEach((v, k) => { headersObj[k] = v; });
      const response = handlePostgRestRequest(
        pathname,
        url.searchParams,
        request.method,
        headersObj,
        body
      );
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err: any) {
      console.error("[start] local-db rest error:", err);
      return new Response(JSON.stringify({ error: err?.message || String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return await next();
});

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error: any) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("Server exception:", error);

    const url = request?.url || "";
    const accept = request?.headers?.get("accept") || "";
    if (url.includes("/api/") || accept.includes("application/json")) {
      return new Response(JSON.stringify({ error: error?.message || "Internal pipeline server error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [apiMiddleware, errorMiddleware, csrfMiddleware],
}));

