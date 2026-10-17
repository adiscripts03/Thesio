import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function pipelineDevServerPlugin(): Plugin {
  return {
    name: "intelibot-pipeline-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        const pathname = url.split("?")[0];

        // 1. Intercept /api/pipeline POST requests
        if (pathname === "/api/pipeline" && req.method === "POST") {
          let rawBody = "";
          req.on("data", (chunk) => {
            rawBody += chunk;
          });
          req.on("end", async () => {
            try {
              const body = rawBody ? JSON.parse(rawBody) : {};
              const { handlePipelineAction } = await server.ssrLoadModule("./api/lib/pipeline.server.ts");
              const result = await handlePipelineAction(body, req);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, result }));
            } catch (err: any) {
              console.error("[dev-server] pipeline action error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || String(err), detail: String(err) }));
            }
          });
          return;
        }

        // 2. Intercept PostgREST-style requests for local database (/rest/v1/* or /api/rest/*)
        if (pathname && (pathname.startsWith("/rest/v1/") || pathname.startsWith("/api/rest/"))) {
          let rawBody = "";
          req.on("data", (chunk) => {
            rawBody += chunk;
          });
          req.on("end", async () => {
            try {
              const parsedUrl = new URL(url, "http://localhost:8080");
              const body = rawBody ? JSON.parse(rawBody) : undefined;
              const { handlePostgRestRequest } = await server.ssrLoadModule("./api/lib/local-db.ts");
              const response = handlePostgRestRequest(
                parsedUrl.pathname,
                parsedUrl.searchParams,
                req.method || "GET",
                req.headers as any,
                body
              );
              res.setHeader("Content-Type", "application/json");
              res.statusCode = response.status;
              res.end(JSON.stringify(response.body));
            } catch (err: any) {
              console.error("[dev-server] local-db rest error:", err);
              res.setHeader("Content-Type", "application/json");
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || String(err) }));
            }
          });
          return;
        }

        // 3. Fallthrough to default Vite handling
        next();
      });
    },
  };
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [pipelineDevServerPlugin()],
    server: {
      proxy: {
        "/api/extract-pdf": "http://127.0.0.1:8000",
        "/api/execute": "http://127.0.0.1:8000",
        "/api/py": "http://127.0.0.1:8000",
      },
    },
  },
});
