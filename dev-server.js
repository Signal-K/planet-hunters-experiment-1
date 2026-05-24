/* eslint-env node */
/**
 * Local dev server for the React shell (root-served).
 * Serves the project root so index.html + react-shell.js + /game/* all work.
 *
 * Usage:  node dev-server.js  (or npm run web:dev)
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname);
const PORT = Number(process.env.PORT || 3333);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

function safeResolve(requestPath) {
  const clean = decodeURIComponent((requestPath || "/").split("?")[0]);
  const rel = clean.replace(/^\/+/, "") || "index.html";
  const abs = path.resolve(ROOT, rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return null;
  return abs;
}

http
  .createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end("Method not allowed");
      return;
    }

    const { pathname } = new URL(req.url || "/", "http://localhost");

    // Serve local runtime config — points all Supabase calls at the local dev instance.
    if (pathname === "/api/runtime-config") {
      const regionRaw = String(process.env.Posthog_Region || process.env.POSTHOG_REGION || "US Cloud").toLowerCase();
      const isEu = regionRaw.includes("eu");
      const payload = {
        posthog: {
          projectToken: process.env.Posthog_Project_Token || process.env.POSTHOG_PROJECT_TOKEN || "",
          projectId: process.env.Posthog_Project_ID || process.env.POSTHOG_PROJECT_ID || "",
          region: process.env.Posthog_Region || process.env.POSTHOG_REGION || "",
          apiHost: process.env.Posthog_API_Host || process.env.POSTHOG_API_HOST || (isEu ? "https://eu.i.posthog.com" : "https://us.i.posthog.com"),
          uiHost: process.env.Posthog_UI_Host || process.env.POSTHOG_UI_HOST || (isEu ? "https://eu.posthog.com" : "https://us.posthog.com"),
          surveyId: process.env.Posthog_Survey_ID || process.env.POSTHOG_SURVEY_ID || "019c9df8-db7f-0000-072f-73b3347a4d6c",
        },
        supabase: {
          url: process.env.SUPABASE_URL || "http://127.0.0.1:54321",
          anonKey: process.env.SUPABASE_ANON || "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
        },
        push: { vapidPublicKey: "" },
      };
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(payload));
      return;
    }

    let fp = safeResolve(pathname);

    if (!fp) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
      fp = path.join(fp, "index.html");
    }

    if (!fs.existsSync(fp)) {
      res.writeHead(404);
      res.end("Not found: " + pathname);
      return;
    }

    const ext = path.extname(fp).toLowerCase();
    // Never cache game assets in dev — forces the browser to always fetch fresh files.
    // COOP/COEP are required for Godot 4 WASM threading (SharedArrayBuffer).
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-site",
    });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(fp).pipe(res);
  })
  .listen(PORT, process.env.HOST || "127.0.0.1", () => {
    const host = process.env.HOST || "127.0.0.1";
    console.log(`Dev server: http://${host}:${PORT}`);
    console.log(`Serving root: ${ROOT}`);
  });
