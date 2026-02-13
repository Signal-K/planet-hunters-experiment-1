const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.resolve(__dirname, "public");
const GODOT_WEB_DIR = path.resolve(
  process.env.GODOT_WEB_DIR || path.join(ROOT_DIR, "electron-dist", "godot-web")
);
const DEFAULT_PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

function resolveSafePath(rootDir, requestPath) {
  const cleanPath = decodeURIComponent((requestPath || "").split("?")[0]);
  const relativePath = cleanPath.replace(/^\/+/, "");
  const normalizedRoot = path.resolve(rootDir);
  const absolutePath = path.resolve(normalizedRoot, relativePath || "index.html");
  if (absolutePath !== normalizedRoot && !absolutePath.startsWith(normalizedRoot + path.sep)) {
    return null;
  }
  return absolutePath;
}

function sendFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(response);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function createRequestHandler() {
  return (request, response) => {
    const method = request.method || "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }

    const parsedUrl = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = parsedUrl.pathname || "/";

    if (pathname === "/healthz") {
      const gameIndexExists = fs.existsSync(path.join(GODOT_WEB_DIR, "index.html"));
      sendJson(response, 200, {
        ok: true,
        gameIndexExists,
        gameDir: GODOT_WEB_DIR,
      });
      return;
    }

    const servingGame = pathname === "/game" || pathname.startsWith("/game/");
    const rootDir = servingGame ? GODOT_WEB_DIR : PUBLIC_DIR;
    const rawPath = servingGame ? pathname.replace(/^\/game\/?/, "") : pathname.replace(/^\//, "");

    let filePath = resolveSafePath(rootDir, rawPath || "index.html");
    if (filePath == null) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    if (method === "HEAD") {
      response.writeHead(200);
      response.end();
      return;
    }

    sendFile(filePath, response);
  };
}

function createServer() {
  return http.createServer(createRequestHandler());
}

if (require.main === module) {
  const server = createServer();
  server.listen(DEFAULT_PORT, "127.0.0.1", () => {
    console.log(`Planet Hunters web app running at http://127.0.0.1:${DEFAULT_PORT}`);
    console.log(`Serving shell from: ${PUBLIC_DIR}`);
    console.log(`Serving Godot build from: ${GODOT_WEB_DIR}`);
  });
}

module.exports = {
  createRequestHandler,
  createServer,
  resolveSafePath,
};
