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
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(fp).pipe(res);
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`Dev server: http://127.0.0.1:${PORT}`);
    console.log(`Serving root: ${ROOT}`);
  });
