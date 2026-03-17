const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { URL } = require("url");

// ── Web Push (optional — degrades gracefully if VAPID keys not set) ───────────
let _webPush = null;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    _webPush = require("web-push");
    _webPush.setVapidDetails("mailto:noreply@planet-hunters.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.warn("[push] web-push unavailable:", e.message);
    _webPush = null;
  }
} else {
  console.log("[push] VAPID keys not set — push notifications disabled");
}

// In-memory subscription store: endpoint → PushSubscription JSON
const _pushSubscriptions = new Map();
// Scheduled push timers: timerId → setTimeout handle
const _scheduledPushes = new Map();

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

// ── Mission narrative generation ─────────────────────────────────────────────

// In-memory cache: cacheKey → { title, description, contractor_quote }
const _missionCache = new Map();
// Variety history: contractor_id → [last-5 contractor_quotes]
const _contractorHistory = new Map();

function _narrativeCacheKey(p) {
  return [p.contractor_id, p.mission_type, p.mineral, p.quantity, p.target_label, p.payout_tier].join("|");
}

function _phaseFromAffinity(affinity) {
  const a = Number(affinity) || 0;
  if (a <= 20) return "initial partnership";
  if (a <= 50) return "established working relationship";
  if (a <= 80) return "trusted alliance";
  return "strategic partnership";
}

function _callAnthropicHaiku(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Promise.reject(new Error("ANTHROPIC_API_KEY not set"));
  const body = JSON.stringify({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) reject(new Error(parsed.error.message));
            else resolve(parsed);
          } catch (e) {
            reject(new Error("Anthropic response parse error: " + e.message));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function _readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 65536) reject(new Error("Request body too large"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleGenerateMission(request, response) {
  let params;
  try {
    const raw = await _readBody(request);
    params = JSON.parse(raw);
  } catch (e) {
    sendJson(response, 400, { error: "Invalid JSON body: " + e.message });
    return;
  }

  const {
    contractor_id = "",
    contractor_name = "Contractor",
    contractor_role = "Resource acquisition",
    mission_type = "extraction",
    mineral = "Iron",
    quantity = 100,
    target_label = "Unknown Target",
    target_type = "asteroid",
    narrative_tone = "professional",
    payout_tier = "standard",
    affinity_level = 0,
  } = params;

  const cacheKey = _narrativeCacheKey(params);
  if (_missionCache.has(cacheKey)) {
    sendJson(response, 200, _missionCache.get(cacheKey));
    return;
  }

  const phase = _phaseFromAffinity(affinity_level);
  const history = _contractorHistory.get(contractor_id) || [];
  const avoidSection =
    history.length > 0
      ? "\nAvoid repeating themes or phrases similar to these previous contractor quotes:\n" +
        history.map((q) => `- "${q}"`).join("\n")
      : "";

  const prompt =
    `You are writing mission content for a sci-fi space mining mobile game called Planet Hunters.\n` +
    `Contractor: ${contractor_name} (${contractor_role})\n` +
    `Partnership phase: ${phase}\n` +
    `Mission type: ${mission_type}\n` +
    `Mineral target: ${mineral} (${quantity} kg)\n` +
    `Destination: ${target_label} (${target_type})\n` +
    `Payout tier: ${payout_tier}\n` +
    `Tone: ${narrative_tone}\n` +
    avoidSection +
    `\n\nGenerate mission briefing text as a JSON object with exactly these three string fields:\n` +
    `- "title": Short mission name, 4–7 words, professional/scientific\n` +
    `- "description": 2-sentence mission briefing, specific, mentions mineral and destination\n` +
    `- "contractor_quote": 1 short in-character quote from a ${contractor_name} representative, ` +
    `reflecting the ${phase} and ${narrative_tone} tone, 10–20 words\n\n` +
    `Respond with ONLY valid JSON. No markdown fences, no extra text.`;

  let result;
  try {
    const apiResponse = await _callAnthropicHaiku(prompt);
    const text = (apiResponse.content[0].text || "").trim();
    result = JSON.parse(text);
    if (!result.title || !result.description || !result.contractor_quote) {
      throw new Error("Incomplete fields in AI response");
    }
  } catch (e) {
    console.error("[generate-mission] AI call failed:", e.message);
    // Graceful fallback — procedural text so the UI never breaks
    result = {
      title: `${mission_type.charAt(0).toUpperCase() + mission_type.slice(1)} — ${target_label}`,
      description: `Retrieve ${quantity} kg of ${mineral} from ${target_label}. Standard extraction protocols apply.`,
      contractor_quote: `We're counting on you to deliver. Good luck out there.`,
    };
  }

  _missionCache.set(cacheKey, result);
  const newHistory = [...history, result.contractor_quote].slice(-5);
  _contractorHistory.set(contractor_id, newHistory);

  sendJson(response, 200, result);
}

// ── Push notification helpers ─────────────────────────────────────────────────

async function sendPushToAll(title, body, tag, url) {
  if (!_webPush) return;
  const payload = JSON.stringify({ title, body, tag: tag || "planet-hunters", url: url || "/" });
  const dead = [];
  for (const [endpoint, subscription] of _pushSubscriptions) {
    try {
      await _webPush.sendNotification(subscription, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        dead.push(endpoint);
      } else {
        console.warn("[push] send error:", err.message);
      }
    }
  }
  for (const ep of dead) _pushSubscriptions.delete(ep);
}

async function handlePushSubscribe(request, response) {
  let body;
  try {
    const raw = await _readBody(request);
    body = JSON.parse(raw);
  } catch (e) {
    sendJson(response, 400, { error: "Invalid JSON" });
    return;
  }
  if (!body || !body.endpoint) {
    sendJson(response, 400, { error: "Missing endpoint" });
    return;
  }
  _pushSubscriptions.set(body.endpoint, body);
  sendJson(response, 200, { ok: true, subscribers: _pushSubscriptions.size });
}

async function handlePushNotify(request, response) {
  let body;
  try {
    const raw = await _readBody(request);
    body = JSON.parse(raw);
  } catch (e) {
    sendJson(response, 400, { error: "Invalid JSON" });
    return;
  }
  const { title = "Planet Hunters", message = "", tag = "planet-hunters", url = "/", schedule_after_secs = 0 } = body || {};
  const delayMs = Math.max(0, Number(schedule_after_secs || 0)) * 1000;

  if (delayMs > 0) {
    const timerId = `${Date.now()}_${Math.random()}`;
    const handle = setTimeout(async () => {
      _scheduledPushes.delete(timerId);
      await sendPushToAll(title, message, tag, url);
    }, delayMs);
    _scheduledPushes.set(timerId, handle);
    sendJson(response, 200, { ok: true, scheduled_in_secs: schedule_after_secs, timer_id: timerId });
  } else {
    await sendPushToAll(title, message, tag, url);
    sendJson(response, 200, { ok: true, sent: true });
  }
}

function handleRuntimeConfig(response) {
  const regionRaw = String(process.env.POSTHOG_REGION || "US Cloud").toLowerCase();
  const isEu = regionRaw.includes("eu");
  sendJson(response, 200, {
    posthog: {
      projectToken: process.env.POSTHOG_PROJECT_TOKEN || "",
      projectId: process.env.POSTHOG_PROJECT_ID || "",
      region: process.env.POSTHOG_REGION || "",
      apiHost: process.env.POSTHOG_API_HOST || (isEu ? "https://eu.i.posthog.com" : "https://us.i.posthog.com"),
      uiHost: process.env.POSTHOG_UI_HOST || (isEu ? "https://eu.posthog.com" : "https://us.posthog.com"),
      surveyId: process.env.POSTHOG_SURVEY_ID || "019c9df8-db7f-0000-072f-73b3347a4d6c",
    },
    supabase: {
      url: process.env.SUPABASE_URL || "",
      anonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON || "",
    },
    push: {
      vapidPublicKey: VAPID_PUBLIC_KEY,
    },
  });
}

// ── Request handler ───────────────────────────────────────────────────────────

function createRequestHandler() {
  return (request, response) => {
    const method = request.method || "GET";
    const parsedUrl = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = parsedUrl.pathname || "/";

    // API routes (POST allowed)
    if (method === "POST" && pathname === "/api/generate-mission") {
      handleGenerateMission(request, response).catch((err) => {
        console.error("[generate-mission] unhandled error:", err.message);
        sendJson(response, 500, { error: "Internal server error" });
      });
      return;
    }

    if (method === "POST" && pathname === "/api/push-subscribe") {
      handlePushSubscribe(request, response).catch((err) => {
        console.error("[push-subscribe] error:", err.message);
        sendJson(response, 500, { error: "Internal server error" });
      });
      return;
    }

    if (method === "POST" && pathname === "/api/push-notify") {
      handlePushNotify(request, response).catch((err) => {
        console.error("[push-notify] error:", err.message);
        sendJson(response, 500, { error: "Internal server error" });
      });
      return;
    }

    if (method === "GET" && pathname === "/api/runtime-config") {
      handleRuntimeConfig(response);
      return;
    }

    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }


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
    console.log(`Star Sailors: Experiment 1 running at http://127.0.0.1:${DEFAULT_PORT}`);
    console.log(`Serving shell from: ${PUBLIC_DIR}`);
    console.log(`Serving Godot build from: ${GODOT_WEB_DIR}`);
  });
}

module.exports = {
  createRequestHandler,
  createServer,
  resolveSafePath,
};
