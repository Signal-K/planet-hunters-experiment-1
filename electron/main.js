const { app, BrowserWindow, dialog, session } = require("electron");
const fs = require("fs");
const http = require("http");
const path = require("path");

const MIME_TYPES = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pck": "application/octet-stream",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
};

let localServer;

function getGodotWebDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "godot-web");
  }
  return path.join(__dirname, "..", "electron-dist", "godot-web");
}

function resolvePath(rootDir, requestPath) {
  const cleanRequestPath = decodeURIComponent((requestPath || "").split("?")[0]);
  const candidate = cleanRequestPath.replace(/^\/+/, "") || "index.html";
  const normalizedPath = path.normalize(candidate);
  const absolutePath = path.join(rootDir, normalizedPath);
  const resolvedRoot = path.resolve(rootDir);

  if (!absolutePath.startsWith(resolvedRoot)) {
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

function startLocalServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const method = request.method || "GET";
      if (method !== "GET" && method !== "HEAD") {
        response.writeHead(405);
        response.end("Method not allowed");
        return;
      }

      const resolvedPath = resolvePath(rootDir, request.url);
      if (!resolvedPath) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      let filePath = resolvedPath;
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
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve server address."));
        return;
      }

      resolve({ server, port: address.port });
    });
  });
}

function createMainWindow(port) {
  const window = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 576,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const cacheBust = Date.now();
  window.loadURL(`http://127.0.0.1:${port}/index.html?v=${cacheBust}`);
}

app.whenReady().then(async () => {
  const godotWebDir = getGodotWebDir();
  const indexFile = path.join(godotWebDir, "index.html");

  if (!fs.existsSync(indexFile)) {
    await dialog.showMessageBox({
      type: "error",
      title: "Missing Godot Desktop Export",
      message: "Unable to find electron-dist/godot-web/index.html.",
      detail: "Run `npm run godot:export:desktop` before starting Electron.",
    });
    app.quit();
    return;
  }

  try {
    if (!app.isPackaged) {
      await session.defaultSession.clearCache();
    }
    const { server, port } = await startLocalServer(godotWebDir);
    localServer = server;
    createMainWindow(port);
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "Startup Failure",
      message: "Failed to start local desktop server.",
      detail: String(error),
    });
    app.quit();
  }
});

app.on("before-quit", () => {
  if (localServer) {
    localServer.close();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});
