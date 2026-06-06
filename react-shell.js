/* eslint-env browser */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@19";
import { createRoot } from "https://esm.sh/react-dom@19/client";

const COOKIE_NAME = "landnam_progress_v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ACTION_LOG_KEY = "landnam_action_log_v1";
const SURVEY_SHOWN_KEY = "landnam_exit_survey_first_mission_v1";
const MICRO_SURVEY_KEYS = {
  contractor:   "landnam_micro_survey_contractor_v1",
  mining:       "landnam_micro_survey_mining_v1",
  science:      "landnam_micro_survey_science_v1",
  progression2: "landnam_micro_survey_progression_stage2_v1",
  progression3: "landnam_micro_survey_progression_stage3_v1",
  progression4: "landnam_micro_survey_progression_stage4_v1",
  launch:       "landnam_micro_survey_first_launch_v1",
  pwa_install:  "landnam_micro_survey_pwa_install_v1",
  m4_complete:  "landnam_micro_survey_m4_complete_v1",
  return_visit: "landnam_micro_survey_return_visit_v1",
  level_up:     "landnam_micro_survey_level_up_v1",
  planet_found: "landnam_micro_survey_planet_found_v1",
  difficulty:   "landnam_micro_survey_difficulty_v1",
};
const SESSION_COUNT_KEY = "landnam_session_count_v1";
const MICRO_SURVEY_IDS = {
  contractor:  "019ccaf8-4299-0000-b3ad-92a57ab75b95",
  mining:      "019ccaf8-c4d8-0000-901b-aa850dfd43c5",
  science:     "019ccaf9-0259-0000-d411-e11fdc643d97",
  progression: "019ccaf9-3453-0000-b6b9-0e41fcae8f1c",
  launch:      "019e5a4e-46ab-0000-df9e-81f0e919a252",
  pwa_install: "019e5a4e-4c83-0000-1c17-7bd8754ad640",
  m4_complete: "019e5a4e-532f-0000-da2b-18527d4e3299",
  return_visit: "019e5a4e-5958-0000-e011-fc51b26ca89d",
  level_up:     "019e5a4e-5f74-0000-2470-c06526c3e36d",
  planet_found: "019e5a4e-6528-0000-b69d-e5745079ffd5",
  difficulty:   "019e5a4e-6b23-0000-dbb1-0bed0fad9910",
};
const SURVEY_OVERLAY_ID = "landnam-survey-overlay";
const FEEDBACK_SURVEY_ID = "019e7269-3773-0000-a6d1-d944a8724a09";
const SURVEY_COOLDOWN_MS = 60 * 1000;
const SUPABASE_SESSION_STORAGE_KEY = "landnam_supabase_guest";
const XP_STATE_KEY = "landnam_xp_state_v1";
const DEFAULT_RUNTIME_CONFIG = {
  posthog: {
    projectToken: "",
    apiHost: "https://us.i.posthog.com",
    uiHost: "https://us.posthog.com",
    surveyId: "",
  },
  supabase: {
    url: "",
    anonKey: "",
  },
};

let _actionLog = [];
let _supabaseClientPromise = null;
let _surveyShownInThisBoot = false;
let _posthogPromise = null;
let _runtimeConfig = null;
let _runtimeConfigPromise = null;
let _xpSyncInFlight = false;
let _pendingXpSnapshot = null;
// Set to true when this is the 2nd session; cleared once the survey fires
let _pendingReturnVisitSurvey = false;
let _cachedSurveyDefs = null;
let _surveyOpening = false;
let _surveyLastClosedAt = 0;

const LEVEL_UNLOCK_HINTS = {
  2: "Longer range unlocked",
  3: "Faster mining speed unlocked",
  4: "Cargo capacity increased",
  5: "Advanced scanner unlocked",
  6: "Refinery unlocked — refine minerals before selling for higher returns",
  7: "Off-world refinery unlocked — process minerals at the source",
  8: "Extended scanner range and dedicated refinery slot unlocked",
};

// ── Push notifications ────────────────────────────────────────────────────────

function _urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function initPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    window.__swRegistration = registration;

    const config = await getRuntimeConfig();
    const vapidPublicKey = config && config.push && config.push.vapidPublicKey;
    if (!vapidPublicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(vapidPublicKey),
    }));

    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    // Expose for GDScript → postMessage bridge
    window.__schedulePush = async function(event, delayMs, payload) {
      try {
        await fetch("/api/push-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: (payload && payload.title) || "Landnám",
            message: (payload && payload.body) || "",
            tag: event || "landnam",
            url: (payload && payload.url) || "/",
            schedule_after_secs: Math.round((delayMs || 0) / 1000),
          }),
        });
      } catch (e) {
        console.warn("[push] schedule failed:", e);
      }
    };
  } catch (e) {
    console.warn("[push] init failed:", e);
  }
}

function vibrate(pattern) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

function isPwaMode() {
  if (typeof window === "undefined") return false;
  const displayModes = ["standalone", "fullscreen", "minimal-ui"];
  const displayModeMatch = displayModes.some((mode) => {
    try {
      return window.matchMedia(`(display-mode: ${mode})`).matches;
    } catch (_error) {
      return false;
    }
  });
  const iosStandalone = window.navigator && window.navigator.standalone === true;
  const fullscreenElement = typeof document !== "undefined" && !!document.fullscreenElement;
  return displayModeMatch || iosStandalone || fullscreenElement;
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function readCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function parseProgress(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function saveProgress(nextProgress, setProgress) {
  const serialized = JSON.stringify(nextProgress);
  writeCookie(COOKIE_NAME, serialized);
  setProgress(nextProgress);
}

function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function readXpState() {
  return safeJsonParse(localStorage.getItem(XP_STATE_KEY), null);
}

function writeXpState(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  localStorage.setItem(XP_STATE_KEY, JSON.stringify(snapshot));
}

function mergeRuntimeConfig(remoteConfig) {
  const fallback = DEFAULT_RUNTIME_CONFIG;
  const remotePosthog = (remoteConfig && remoteConfig.posthog) || {};
  const remoteSupabase = (remoteConfig && remoteConfig.supabase) || {};
  return {
    posthog: {
      projectToken: remotePosthog.projectToken || fallback.posthog.projectToken,
      projectId: remotePosthog.projectId || "",
      region: remotePosthog.region || "",
      apiHost: remotePosthog.apiHost || fallback.posthog.apiHost,
      uiHost: remotePosthog.uiHost || fallback.posthog.uiHost,
      surveyId: remotePosthog.surveyId || fallback.posthog.surveyId,
    },
    supabase: {
      url: remoteSupabase.url || fallback.supabase.url,
      anonKey: remoteSupabase.anonKey || fallback.supabase.anonKey,
    },
  };
}

async function getRuntimeConfig() {
  if (_runtimeConfig) {
    return _runtimeConfig;
  }
  if (_runtimeConfigPromise) {
    return _runtimeConfigPromise;
  }
  _runtimeConfigPromise = fetch("/api/runtime-config", { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Runtime config request failed: ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => {
      _runtimeConfig = mergeRuntimeConfig(payload);
      return _runtimeConfig;
    })
    .catch((error) => {
      console.warn("Falling back to default runtime config:", error);
      _runtimeConfig = mergeRuntimeConfig(null);
      return _runtimeConfig;
    })
    .finally(() => {
      _runtimeConfigPromise = null;
    });
  return _runtimeConfigPromise;
}

function loadActionLog() {
  const parsed = safeJsonParse(localStorage.getItem(ACTION_LOG_KEY), []);
  _actionLog = Array.isArray(parsed) ? parsed.slice(-200) : [];
}

function saveActionLog() {
  try {
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(_actionLog.slice(-200)));
  } catch (error) {
    console.warn("Failed to persist action log:", error);
  }
}

function pushAction(eventName, payload) {
  const entry = {
    t: Date.now(),
    e: String(eventName || "unknown"),
    p: payload && typeof payload === "object" ? payload : {},
  };
  _actionLog.push(entry);
  if (_actionLog.length > 200) {
    _actionLog = _actionLog.slice(_actionLog.length - 200);
  }
  saveActionLog();
}

// Stub out every native PostHog survey API so no popover can auto-render.
// disable_surveys: true in init() is the primary guard; this is the secondary
// belt in case a posthog-js build loads the survey plugin before the flag is
// evaluated, or in case the config is ignored during a hot-reload.
function disableNativePostHogSurveys(client) {
  if (!client) return;
  const noop = () => {};
  const noopAsync = () => Promise.resolve([]);
  try {
    if (client.surveys && typeof client.surveys === "object") {
      client.surveys.loadIfEnabled = noop;
      client.surveys.afterDecideResponse = noop;
      client.surveys.getSurveys = noopAsync;
      client.surveys.getActiveMatchingSurveys = noopAsync;
    }
    if (typeof client.getActiveMatchingSurveys === "function") {
      client.getActiveMatchingSurveys = noopAsync;
    }
    if (typeof client.getSurveys === "function") {
      client.getSurveys = noopAsync;
    }
    if (typeof client.renderSurvey === "function") {
      client.renderSurvey = noop;
    }
    if (typeof client.canRenderSurvey === "function") {
      client.canRenderSurvey = () => false;
    }
  } catch (e) {
    console.warn("[posthog] disableNativePostHogSurveys failed:", e);
  }
}

async function loadPostHogClient() {
  if (_posthogPromise) {
    return _posthogPromise;
  }
  _posthogPromise = Promise.all([getRuntimeConfig(), import("https://esm.sh/posthog-js@1.279.2?bundle")])
    .then(([runtimeConfig, mod]) => {
      const posthogConfig = runtimeConfig.posthog || DEFAULT_RUNTIME_CONFIG.posthog;
      if (!posthogConfig.projectToken) {
        throw new Error("PostHog project token missing");
      }
      const client = mod.default || mod.posthog || mod;
      if (!client || typeof client.init !== "function") {
        throw new Error("PostHog client not available");
      }
      client.init(posthogConfig.projectToken, {
        api_host: posthogConfig.apiHost,
        ui_host: posthogConfig.uiHost,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        autocapture: true,
        disable_surveys: true,
        session_recording: {
          maskAllInputs: false,
          recordCrossOriginIframes: true,
        },
        loaded(ph) {
          disableNativePostHogSurveys(ph);
          ph.register({
            app: "landnam_experiment1_web",
            runtime: "godot_web_shell",
          });
        },
      });
      disableNativePostHogSurveys(client);
      return client;
    })
    .catch((error) => {
      _posthogPromise = null;
      throw error;
    });
  return _posthogPromise;
}

function registerAnalyticsContext(properties) {
  loadPostHogClient()
    .then((client) => {
      client.register(properties);
    })
    .catch((error) => {
      console.warn("PostHog register failed:", error);
    });
}

function captureAnalyticsEvent(eventName, payload = {}) {
  loadPostHogClient()
    .then((client) => {
      client.capture(eventName, payload);
      client.register({
        last_game_event: eventName,
        mission_stage: payload.mission_stage,
        experience_level: payload.experience_level,
        selected_target_id: payload.selected_target_id || payload.target_id || "",
        selected_target_type: payload.target_type || payload.preview_target_type || "",
      });
    })
    .catch((error) => {
      console.warn(`PostHog capture failed for ${eventName}:`, error);
    });
}

async function syncAnalyticsIdentity(distinctId) {
  if (!distinctId) {
    return;
  }
  try {
    const client = await loadPostHogClient();
    client.identify(distinctId, {
      source: "landnam_experiment1_web",
    });
  } catch (error) {
    console.warn("PostHog identify failed:", error);
  }
}

async function loadSupabaseClient() {
  if (_supabaseClientPromise) {
    return _supabaseClientPromise;
  }
  _supabaseClientPromise = Promise.all([getRuntimeConfig(), import("https://esm.sh/@supabase/supabase-js@2?bundle")]).then(
    ([runtimeConfig, mod]) => {
      const createClient = mod.createClient || (mod.default && mod.default.createClient);
      if (!createClient) {
        throw new Error("Supabase createClient not available");
      }
      const supabaseConfig = runtimeConfig.supabase || DEFAULT_RUNTIME_CONFIG.supabase;
      return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: SUPABASE_SESSION_STORAGE_KEY,
        },
      });
    }
  );
  return _supabaseClientPromise;
}

async function ensureGuestUser() {
  const client = await loadSupabaseClient();
  const current = await client.auth.getUser();
  if (current && current.data && current.data.user && current.data.user.id) {
    return current.data.user.id;
  }
  const created = await client.auth.signInAnonymously({
    options: {
      data: {
        source: "landnam_experiment1_web",
        created_by: "react_shell_survey_trigger",
      },
    },
  });
  if (created && created.error) {
    throw created.error;
  }
  const user = created && created.data && created.data.user;
  if (!user || !user.id) {
    throw new Error("Anonymous sign-in succeeded but no user id was returned");
  }
  return user.id;
}

async function syncExperienceToSupabase(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  _pendingXpSnapshot = snapshot;
  if (_xpSyncInFlight) return;
  _xpSyncInFlight = true;
  try {
    while (_pendingXpSnapshot) {
      const next = _pendingXpSnapshot;
      _pendingXpSnapshot = null;
      const client = await loadSupabaseClient();
      await client.auth.updateUser({
        data: {
          experience_level: Number(next.experience_level || 1),
          experience_xp: Number(next.experience_xp || 0),
          experience_updated_at: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.warn("Failed to sync experience to Supabase profile:", error);
  } finally {
    _xpSyncInFlight = false;
  }
}

function localDistinctId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `local_guest_${crypto.randomUUID()}`;
  }
  return `local_guest_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

async function resolveSurveyDistinctId() {
  try {
    const client = await loadSupabaseClient();
    const { data: { user: currentUser } } = await client.auth.getUser();
    
    if (currentUser && currentUser.id) {
      // If we have a real user, ensure PostHog knows about them
      syncAnalyticsIdentity(currentUser.id);
      return currentUser.id;
    }

    // Fall back to anonymous guest
    const guestId = await ensureGuestUser();
    syncAnalyticsIdentity(guestId);
    return guestId;
  } catch (error) {
    console.warn("Falling back to local distinct id for survey:", error);
    const fallback = localDistinctId();
    syncAnalyticsIdentity(fallback);
    return fallback;
  }
}

function buildProgressJson(finalEventPayload) {
  const compactActions = _actionLog.slice(-120).map((item) => ({
    t: item.t,
    e: item.e,
    p: item.p || {},
  }));
  const summary = {
    version: 1,
    survey_trigger: "first_mission_completed",
    final_event: finalEventPayload || {},
    actions: compactActions,
  };

  let json = JSON.stringify(summary);
  if (json.length <= 3500) {
    return json;
  }
  while (summary.actions.length > 20) {
    summary.actions.shift();
    json = JSON.stringify(summary);
    if (json.length <= 3500) {
      return json;
    }
  }
  return json.slice(0, 3500);
}

function removeSurveyOverlay() {
  const existing = document.getElementById(SURVEY_OVERLAY_ID);
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

function finishInlineSurvey(surveyId, reason) {
  removeSurveyOverlay();
  _surveyOpening = false;
  _surveyLastClosedAt = Date.now();
  const metadata = { survey_id: surveyId, close_reason: reason };
  pushAction("survey_closed", metadata);
  captureAnalyticsEvent("survey_closed", metadata);
}

// ── Native survey overlay — no iframe, no dependency on us.posthog.com ───────
// Fetches survey definitions from the PostHog capture API (us.i.posthog.com),
// renders questions inline, and submits answers directly via the capture API.
// Ad blockers that block us.posthog.com leave this unaffected.

async function _fetchSurveyDefs(projectToken, apiHost) {
  if (_cachedSurveyDefs) return _cachedSurveyDefs;
  try {
    const url = `${apiHost}/api/surveys/?token=${encodeURIComponent(projectToken)}`;
    const resp = await fetch(url, { cache: "default" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    _cachedSurveyDefs = {};
    for (const survey of (data.surveys || [])) {
      _cachedSurveyDefs[survey.id] = survey;
    }
    return _cachedSurveyDefs;
  } catch (e) {
    console.warn("[survey] Could not fetch survey definitions:", e.message);
    return {};
  }
}

function _styleNativeChoiceBtn(btn, selected) {
  btn.style.display = "block";
  btn.style.width = "100%";
  btn.style.padding = "10px 16px";
  btn.style.border = selected ? "2px solid #4ab4ff" : "1px solid #233455";
  btn.style.borderRadius = "8px";
  btn.style.background = selected ? "rgba(74,180,255,0.15)" : "#0e1a2e";
  btn.style.color = selected ? "#4ab4ff" : "#e6efff";
  btn.style.fontSize = "16px";
  btn.style.textAlign = "left";
  btn.style.cursor = "pointer";
  btn.style.transition = "background 0.1s, border-color 0.1s";
}

function _buildSurveyQuestions(container, questions, answers) {
  questions.forEach((q, idx) => {
    const block = document.createElement("div");
    block.style.display = "flex";
    block.style.flexDirection = "column";
    block.style.gap = "10px";

    const label = document.createElement("p");
    label.textContent = q.question || "";
    label.style.margin = "0";
    label.style.color = "#e6efff";
    label.style.fontSize = "17px";
    label.style.fontWeight = "600";
    label.style.lineHeight = "1.4";
    block.appendChild(label);

    if (q.type === "rating") {
      const scaleN = q.scale || 5;
      const lowLabel = q.low_label || q.lowerBoundLabel || "";
      const highLabel = q.high_label || q.upperBoundLabel || "";
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.flexWrap = "wrap";
      if (lowLabel) {
        const lo = document.createElement("span");
        lo.textContent = lowLabel;
        lo.style.color = "#7a9abf";
        lo.style.fontSize = "13px";
        row.appendChild(lo);
      }
      for (let n = 1; n <= scaleN; n++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(n);
        btn.style.width = "48px";
        btn.style.height = "48px";
        btn.style.border = "1px solid #233455";
        btn.style.borderRadius = "8px";
        btn.style.background = "#0e1a2e";
        btn.style.color = "#e6efff";
        btn.style.fontSize = "18px";
        btn.style.fontWeight = "600";
        btn.style.cursor = "pointer";
        btn.style.flexShrink = "0";
        const captured = n;
        btn.addEventListener("click", () => {
          answers[idx] = String(captured);
          for (const sibling of row.querySelectorAll("button")) {
            const isSelected = sibling.textContent === String(captured);
            sibling.style.border = isSelected ? "2px solid #4ab4ff" : "1px solid #233455";
            sibling.style.background = isSelected ? "rgba(74,180,255,0.15)" : "#0e1a2e";
            sibling.style.color = isSelected ? "#4ab4ff" : "#e6efff";
          }
        });
        row.appendChild(btn);
      }
      if (highLabel) {
        const hi = document.createElement("span");
        hi.textContent = highLabel;
        hi.style.color = "#7a9abf";
        hi.style.fontSize = "13px";
        row.appendChild(hi);
      }
      block.appendChild(row);
    } else if (q.type === "multiple_choice") {
      const col = document.createElement("div");
      col.style.display = "flex";
      col.style.flexDirection = "column";
      col.style.gap = "8px";
      for (const choice of (q.choices || [])) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = String(choice);
        _styleNativeChoiceBtn(btn, false);
        btn.addEventListener("click", () => {
          answers[idx] = String(choice);
          for (const sibling of col.querySelectorAll("button")) {
            _styleNativeChoiceBtn(sibling, sibling.textContent === String(choice));
          }
        });
        col.appendChild(btn);
      }
      block.appendChild(col);
    } else {
      // open text
      const ta = document.createElement("textarea");
      ta.placeholder = "Type your answer here\u2026";
      ta.rows = 4;
      ta.style.width = "100%";
      ta.style.background = "#060d1a";
      ta.style.border = "1px solid #233455";
      ta.style.borderRadius = "8px";
      ta.style.color = "#e6efff";
      ta.style.fontSize = "16px";
      ta.style.padding = "10px 14px";
      ta.style.resize = "vertical";
      ta.style.boxSizing = "border-box";
      ta.addEventListener("input", () => { answers[idx] = ta.value.trim(); });
      block.appendChild(ta);
    }

    container.appendChild(block);
  });
}

async function showInlineSurvey(params, surveyIdOverride, options = {}) {
  const bypassCooldown = options.bypassCooldown === true;
  if (_surveyOpening || document.getElementById(SURVEY_OVERLAY_ID)) return false;
  if (!bypassCooldown && Date.now() - _surveyLastClosedAt < SURVEY_COOLDOWN_MS) return false;
  _surveyOpening = true;

  const runtimeConfig = await getRuntimeConfig();
  const surveyId = surveyIdOverride || runtimeConfig.posthog.surveyId;
  if (!surveyId || !runtimeConfig.posthog.projectToken) {
    _surveyOpening = false;
    return false;
  }

  const defs = await _fetchSurveyDefs(runtimeConfig.posthog.projectToken, runtimeConfig.posthog.apiHost);
  const surveyDef = defs[surveyId] || null;
  if (!surveyDef) {
    _surveyOpening = false;
    console.warn("[survey] Definition unavailable:", surveyId);
    return false;
  }
  const surveyName = surveyDef.name || "Share your feedback";
  const questions = surveyDef.questions || [];
  const distinctId = params.distinct_id || "";

  removeSurveyOverlay();

  // Backdrop
  const overlay = document.createElement("div");
  overlay.id = SURVEY_OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(2, 6, 15, 0.88)";
  overlay.style.zIndex = "2147482646";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "min(20px, 4vw)";
  overlay.style.boxSizing = "border-box";

  // Card
  const card = document.createElement("div");
  card.style.width = "min(560px, 100%)";
  card.style.maxHeight = "min(calc(100svh - 32px), 860px)";
  card.style.background = "#080f1c";
  card.style.border = "1px solid #1e3050";
  card.style.borderRadius = "14px";
  card.style.boxShadow = "0 24px 60px rgba(0,0,0,0.65)";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.boxSizing = "border-box";
  card.style.overflow = "hidden";

  // Header
  const header = document.createElement("div");
  header.style.padding = "16px 20px 14px";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.borderBottom = "1px solid #1a2a44";
  header.style.flexShrink = "0";

  const titleEl = document.createElement("span");
  titleEl.textContent = surveyName;
  titleEl.style.color = "#e6efff";
  titleEl.style.fontSize = "16px";
  titleEl.style.fontWeight = "700";
  header.appendChild(titleEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close \u00d7";
  closeBtn.style.border = "1px solid #30496f";
  closeBtn.style.background = "#12213a";
  closeBtn.style.color = "#dce7fb";
  closeBtn.style.padding = "5px 14px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "13px";
  closeBtn.style.fontWeight = "600";
  closeBtn.onclick = () => {
    finishInlineSurvey(surveyId, "close_button");
  };
  header.appendChild(closeBtn);
  card.appendChild(header);

  // Scrollable questions body
  const body = document.createElement("div");
  body.style.padding = "24px 24px 16px";
  body.style.overflowY = "auto";
  body.style.flex = "1";
  body.style.display = "flex";
  body.style.flexDirection = "column";
  body.style.gap = "24px";
  body.style.boxSizing = "border-box";

  const answers = new Array(questions.length).fill(null);
  _buildSurveyQuestions(body, questions, answers);
  card.appendChild(body);

  // Footer
  const footer = document.createElement("div");
  footer.style.padding = "14px 24px 20px";
  footer.style.display = "flex";
  footer.style.gap = "12px";
  footer.style.justifyContent = "flex-end";
  footer.style.borderTop = "1px solid #1a2a44";
  footer.style.flexShrink = "0";

  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.textContent = "Skip";
  skipBtn.style.padding = "10px 22px";
  skipBtn.style.border = "1px solid #233455";
  skipBtn.style.borderRadius = "8px";
  skipBtn.style.background = "transparent";
  skipBtn.style.color = "#7a9abf";
  skipBtn.style.fontSize = "15px";
  skipBtn.style.cursor = "pointer";
  skipBtn.onclick = () => {
    finishInlineSurvey(surveyId, "skip");
  };

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.textContent = "Submit";
  submitBtn.style.padding = "10px 28px";
  submitBtn.style.border = "1px solid #4ab4ff";
  submitBtn.style.borderRadius = "8px";
  submitBtn.style.background = "rgba(74,180,255,0.14)";
  submitBtn.style.color = "#4ab4ff";
  submitBtn.style.fontSize = "15px";
  submitBtn.style.fontWeight = "700";
  submitBtn.style.cursor = "pointer";

  submitBtn.onclick = async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending\u2026";
    skipBtn.disabled = true;

    const properties = { "$survey_id": surveyId, "$survey_name": surveyName };
    answers.forEach((a, i) => {
      if (a == null) return;
      const key = i === 0 ? "$survey_response" : `$survey_response_${i}`;
      properties[key] = String(a);
    });
    for (const k of ["survey_context", "mission_count", "mission_stage"]) {
      if (params[k]) properties[`survey_ctx_${k}`] = params[k];
    }

    try {
      await fetch(`${runtimeConfig.posthog.apiHost}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: runtimeConfig.posthog.projectToken,
          distinct_id: distinctId,
          event: "survey sent",
          properties,
        }),
      });
    } catch (e) {
      console.warn("[survey] Capture failed:", e.message);
    }

    // Thank-you state
    for (const child of [...body.children]) child.remove();
    const ty = document.createElement("p");
    ty.textContent = "Thanks \u2014 your answer has been recorded.";
    ty.style.color = "#4ab4ff";
    ty.style.fontSize = "18px";
    ty.style.textAlign = "center";
    ty.style.margin = "auto";
    body.appendChild(ty);
    footer.style.display = "none";
    setTimeout(() => finishInlineSurvey(surveyId, "submitted"), 2500);
  };

  footer.appendChild(skipBtn);
  footer.appendChild(submitBtn);
  card.appendChild(footer);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const openMeta = {
    survey_id: surveyId,
    survey_context: params.survey_context || "",
    supabase_guest_id: params.supabase_guest_id || "",
  };
  if (params.mission_count) openMeta.mission_count = params.mission_count;
  if (params.mission_stage) openMeta.mission_stage = params.mission_stage;
  pushAction("survey_opened", openMeta);
  captureAnalyticsEvent("survey_opened", openMeta);
  return true;
}

// ── Micro-survey helpers ──────────────────────────────────────────────────────

async function maybeTriggerMicroSurvey(storageKey, surveyId, context, eventPayload) {
  // Each micro-survey has its own localStorage gate — don't show it twice.
  if (localStorage.getItem(storageKey)) return;
  // Skip if no survey ID configured yet.
  if (!surveyId) return;
  try {
    const runtimeConfig = await getRuntimeConfig();
    // Only show PostHog iframe surveys when PostHog is actually configured.
    if (!runtimeConfig.posthog.projectToken) return;
    const distinctId = await resolveSurveyDistinctId();
    const params = {
      distinct_id: distinctId,
      supabase_guest_id: distinctId,
      survey_context: context,
      mission_stage: String((eventPayload && eventPayload.mission_stage) || ""),
    };
    const opened = await showInlineSurvey(params, surveyId);
    if (opened) localStorage.setItem(storageKey, new Date().toISOString());
  } catch (err) {
    _surveyOpening = false;
    console.error("Micro-survey trigger failed:", storageKey, err);
  }
}

async function showFeedbackSurvey(context = {}) {
  try {
    const runtimeConfig = await getRuntimeConfig();
    if (!runtimeConfig.posthog.projectToken) return;
    const distinctId = await resolveSurveyDistinctId();
    await showInlineSurvey({
      distinct_id: distinctId,
      supabase_guest_id: distinctId,
      survey_context: "manual_feedback",
      mission_stage: String(context.mission_stage || ""),
    }, FEEDBACK_SURVEY_ID, { bypassCooldown: true });
  } catch (error) {
    _surveyOpening = false;
    console.error("Feedback survey trigger failed:", error);
  }
}

function maybeShowContractorSurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.contractor,
    MICRO_SURVEY_IDS.contractor,
    "micro_contractor_first_impression",
    payload
  );
}

function maybeShowMiningSurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.mining,
    MICRO_SURVEY_IDS.mining,
    "micro_mining_loop_feel",
    payload
  );
}

function maybeShowScienceSurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.science,
    MICRO_SURVEY_IDS.science,
    "micro_real_science_awareness",
    payload
  );
}

function maybeShowProgressionSurvey(payload) {
  const stage = Number((payload && payload.mission_stage) || 0);
  if (stage < 2 || stage > 3) return; // M4 gets its own dedicated survey below
  const key = MICRO_SURVEY_KEYS["progression" + stage];
  if (!key) return;
  maybeTriggerMicroSurvey(key, MICRO_SURVEY_IDS.progression, "micro_mission_progression_clarity", payload);
}

function maybeShowLaunchSurvey(payload) {
  // Fires after the first rocket launch in M1.
  const stage = Number((payload && payload.mission_stage) || 0);
  if (stage !== 1) return;
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.launch,
    MICRO_SURVEY_IDS.launch,
    "micro_first_launch_feel",
    payload
  );
}

function maybeShowM4CompleteSurvey(payload) {
  // Fires at M4 debrief — end of current content.
  const stage = Number((payload && payload.mission_stage) || 0);
  if (stage !== 4) return;
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.m4_complete,
    MICRO_SURVEY_IDS.m4_complete,
    "micro_m4_end_of_content",
    payload
  );
}

function maybeShowPwaInstallSurvey() {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.pwa_install,
    MICRO_SURVEY_IDS.pwa_install,
    "micro_pwa_install_motivation",
    {}
  );
}

function maybeShowLevelUpSurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.level_up,
    MICRO_SURVEY_IDS.level_up,
    "micro_level_up_progression_speed",
    payload
  );
}


function maybeShowPlanetFoundSurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.planet_found,
    MICRO_SURVEY_IDS.planet_found,
    "micro_planet_discovery_excitement",
    payload
  );
}

function maybeShowDifficultySurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.difficulty,
    MICRO_SURVEY_IDS.difficulty,
    "micro_mission_difficulty_friction",
    payload
  );
}

function maybeShowReturnVisitSurvey() {
  // Increment session count and arm _pendingReturnVisitSurvey on the 2nd session.
  // The survey fires when the player completes a meaningful mechanic — see onGameMessage.
  try {
    const count = Number(localStorage.getItem(SESSION_COUNT_KEY) || "0") + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(count));
    if (count === 2) _pendingReturnVisitSurvey = true;
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────

async function maybeTriggerFirstMissionSurvey(eventPayload) {
  if (_surveyShownInThisBoot) return;
  if (document.getElementById(SURVEY_OVERLAY_ID)) return;
  if (localStorage.getItem(SURVEY_SHOWN_KEY)) return;

  try {
    const runtimeConfig = await getRuntimeConfig();
    // Only show PostHog iframe survey when PostHog is configured; blank iframes
    // would consume the one-per-boot slot and block all subsequent micro-surveys.
    if (!runtimeConfig.posthog.projectToken) return;
    const distinctId = await resolveSurveyDistinctId();
    const missionCount = Number((eventPayload && eventPayload.mission_count) || 0);
    const progressJson = buildProgressJson(eventPayload);
    const params = {
      distinct_id: distinctId,
      supabase_guest_id: distinctId,
      survey_context: "experiment1_first_mission",
      mission_count: String(missionCount || 1),
      mission_action: String((eventPayload && eventPayload.action) || ""),
      mission_badge: String((eventPayload && eventPayload.badge) || ""),
      progress_json: progressJson,
    };
    const opened = await showInlineSurvey(params);
    if (opened) {
      _surveyShownInThisBoot = true;
      localStorage.setItem(SURVEY_SHOWN_KEY, new Date().toISOString());
    }
  } catch (error) {
    _surveyOpening = false;
    console.error("Failed to trigger first mission survey:", error);
    pushAction("survey_trigger_error", {
      message: String(error && error.message ? error.message : error),
    });
  }
}

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const client = await loadSupabaseClient();
      let result;
      if (isLogin) {
        result = await client.auth.signInWithPassword({ email, password });
      } else {
        result = await client.auth.signUp({ email, password });
      }

      if (result.error) throw result.error;

      const user = result.data.user;
      if (user) {
        syncAnalyticsIdentity(user.id);
        captureAnalyticsEvent(isLogin ? "login_success" : "signup_success", {
          method: "email",
          user_id: user.id,
        });
        onAuthSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.message);
      captureAnalyticsEvent("auth_error", {
        message: err.message,
        type: isLogin ? "login" : "signup",
      });
    } finally {
      setLoading(false);
    }
  };

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 15, 0.9)",
        zIndex: 200000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      },
      onClick: onClose,
    },
    React.createElement(
      "div",
      {
        style: {
          width: "min(420px, 100%)",
          background: "#0c1220",
          border: "1px solid #233455",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
        },
        onClick: (e) => e.stopPropagation(),
      },
      React.createElement(
        "h2",
        { style: { margin: "0 0 12px", fontSize: "24px", color: "#e7edf9" } },
        isLogin ? "Welcome Back" : "Create Account"
      ),
      React.createElement(
        "p",
        { style: { margin: "0 0 24px", fontSize: "14px", color: "#a9b4cc", lineHeight: 1.5 } },
        "Save your progress and access points across all games in the Landnám ecosystem (Landnám, Landnám, and more!)."
      ),
      error && React.createElement(
        "div",
        { style: { padding: "12px", background: "rgba(255, 69, 58, 0.1)", border: "1px solid #ff453a", borderRadius: "8px", marginBottom: "20px", color: "#ff453a", fontSize: "14px" } },
        error
      ),
      React.createElement(
        "form",
        { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: "16px" } },
        React.createElement("input", {
          type: "email",
          placeholder: "Email address",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          required: true,
          style: { padding: "12px", borderRadius: "8px", border: "1px solid #233455", background: "#05080f", color: "#fff", outline: "none" },
        }),
        React.createElement("input", {
          type: "password",
          placeholder: "Password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          required: true,
          style: { padding: "12px", borderRadius: "8px", border: "1px solid #233455", background: "#05080f", color: "#fff", outline: "none" },
        }),
        React.createElement(
          "button",
          {
            type: "submit",
            disabled: loading,
            style: { padding: "14px", borderRadius: "8px", border: "none", background: "#4ad0ff", color: "#05080f", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 },
          },
          loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"
        )
      ),
      React.createElement(
        "button",
        {
          onClick: () => setIsLogin(!isLogin),
          style: { background: "none", border: "none", color: "#4ad0ff", marginTop: "20px", width: "100%", textAlign: "center", cursor: "pointer", fontSize: "14px" },
        },
        isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"
      ),
      React.createElement(
        "button",
        {
          onClick: onClose,
          style: { background: "none", border: "none", color: "#a9b4cc", marginTop: "12px", width: "100%", textAlign: "center", cursor: "pointer", fontSize: "13px" },
        },
        "Continue as Guest"
      )
    )
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
function LandingPage({ onPlay }) {
  const canvasRef = useRef(null);
  const [fadeIn, setFadeIn] = useState(false);

  // Kick fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setFadeIn(true), 40);
    return () => clearTimeout(t);
  }, []);

  // Procedural starfield
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const stars = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function seed() {
      stars.length = 0;
      const count = Math.floor((canvas.width * canvas.height) / 3000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.4 + 0.2,
          a: Math.random(),
          speed: Math.random() * 0.004 + 0.001,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,210,255,${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    seed();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", () => { resize(); seed(); });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  const isMob = typeof window !== "undefined" && window.innerWidth < 640;

  return React.createElement(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse at 30% 10%, #111c38 0%, #05080f 55%, #020407 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: fadeIn ? 1 : 0,
        transition: "opacity 0.6s ease",
      },
    },
    // Starfield canvas
    React.createElement("canvas", {
      ref: canvasRef,
      style: { position: "absolute", inset: 0, pointerEvents: "none" },
    }),
    // Subtle planet glow
    React.createElement("div", {
      style: {
        position: "absolute",
        bottom: "-18%",
        right: "-8%",
        width: "clamp(320px, 55vw, 680px)",
        height: "clamp(320px, 55vw, 680px)",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(28,78,130,0.28) 0%, rgba(10,30,70,0.12) 55%, transparent 75%)",
        pointerEvents: "none",
      },
    }),
    // Content card
    React.createElement(
      "div",
      {
        style: {
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: isMob ? "32px 24px" : "52px 48px",
          maxWidth: "680px",
          width: "100%",
        },
      },
      // Eyebrow
      React.createElement(
        "p",
        {
          style: {
            margin: "0 0 16px",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#4ad0ff",
            fontWeight: 600,
            opacity: 0.85,
          },
        },
        "Landnám"
      ),
      // Title
      React.createElement(
        "h1",
        {
          style: {
            margin: "0 0 18px",
            fontSize: isMob ? "42px" : "clamp(52px, 7vw, 80px)",
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "#e7edf9",
            textShadow: "0 0 60px rgba(74,208,255,0.18)",
          },
        },
        "Landnám"
      ),
      // Tagline
      React.createElement(
        "p",
        {
          style: {
            margin: "0 0 36px",
            fontSize: isMob ? "15px" : "18px",
            color: "#a9b4cc",
            lineHeight: 1.6,
            maxWidth: "480px",
          },
        },
        "Mine asteroids. Build settlements. Discover real planets."
      ),
      // Feature pills
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "center",
            marginBottom: "44px",
          },
        },
        ...["🚀  Launch & mine", "🪐  Real TESS data", "📡  Contractor missions", "🏗️  Build your base"].map((label) =>
          React.createElement(
            "span",
            {
              key: label,
              style: {
                padding: "6px 14px",
                borderRadius: "999px",
                border: "1px solid rgba(74,208,255,0.22)",
                background: "rgba(74,208,255,0.06)",
                fontSize: "13px",
                color: "#c8d8f0",
                letterSpacing: "0.02em",
              },
            },
            label
          )
        )
      ),
      // CTA
      React.createElement(
        "button",
        {
          onClick: onPlay,
          style: {
            padding: isMob ? "16px 48px" : "18px 64px",
            fontSize: isMob ? "17px" : "19px",
            fontWeight: 700,
            letterSpacing: "0.03em",
            color: "#05080f",
            background: "linear-gradient(135deg, #4ad0ff 0%, #2ab8f0 100%)",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 0 32px rgba(74,208,255,0.35), 0 4px 16px rgba(0,0,0,0.4)",
            transition: "transform 0.12s ease, box-shadow 0.12s ease",
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.transform = "scale(1.04)";
            e.currentTarget.style.boxShadow = "0 0 48px rgba(74,208,255,0.5), 0 4px 20px rgba(0,0,0,0.5)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 0 32px rgba(74,208,255,0.35), 0 4px 16px rgba(0,0,0,0.4)";
          },
        },
        "Play Now"
      ),
      // Fine print
      React.createElement(
        "p",
        {
          style: {
            marginTop: "20px",
            fontSize: "12px",
            color: "rgba(169,180,204,0.5)",
          },
        },
        "Free to play · No account required · Progress saved locally"
      )
    )
  );
}

function App() {
  const [progress, setProgress] = useState(() => parseProgress(readCookie(COOKIE_NAME)));
  // If the player has a saved progress cookie they've played before — skip the landing page.
  const [playing, setPlaying] = useState(() => parseProgress(readCookie(COOKIE_NAME)) !== null);
  const [xpState, setXpState] = useState(() => readXpState() || { experience_level: 1, experience_xp: 0, franc_balance: 0 });
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Cookie storage active");
  // In PWA mode skip cache-busting so the service worker can cache the game
  const [gameSrc] = useState(() => isPwaMode() ? "/game/index.html" : "/game/index.html?v=" + Date.now());
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 900);
  const [isPwa] = useState(() => isPwaMode());
  const [isIos] = useState(() => isIosDevice());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [levelUpBanner, setLevelUpBanner] = useState(null); // { level, hint }
  const levelUpTimerRef = useRef(null);
  const [showPwaHud, setShowPwaHud] = useState(false);
  const pwaHudTimerRef = useRef(null);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches
  );
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth : 1280)
  );
  const [showPwaHudMenu, setShowPwaHudMenu] = useState(false);

  useEffect(() => {
    loadSupabaseClient().then((client) => {
      client.auth.getUser().then(({ data: { user: currentUser } }) => {
        if (currentUser) {
          setUser(currentUser);
          syncAnalyticsIdentity(currentUser.id);
        }
      });
    });
  }, []);

  useEffect(() => {
    function onResize() {
      setIsMobile(Math.min(window.innerWidth, window.innerHeight) < 900);
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    function onChange(e) { setIsPortrait(e.matches); }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Attempt to lock landscape orientation on PWA/mobile (no-ops silently where unsupported, e.g. iOS)
  useEffect(() => {
    if (!isPwa && !isMobile) return;
    try {
      if (screen.orientation && typeof screen.orientation.lock === "function") {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch (_) {}
  }, [isPwa, isMobile]);

  useEffect(() => {
    loadActionLog();
    pushAction("react_shell_loaded", { href: window.location.href });
    captureAnalyticsEvent("react_shell_loaded", { href: window.location.href });
    resolveSurveyDistinctId().then((distinctId) => {
      registerAnalyticsContext({
        distinct_id_hint: distinctId,
        shell_entry: "react_shell",
      });
    });
    // Return-visit survey — fires only after player engagement (managed inside the function).
    maybeShowReturnVisitSurvey();
    const persistedXp = readXpState();
    if (persistedXp && typeof persistedXp.experience_level !== "undefined") {
      registerAnalyticsContext({
        experience_level: Number(persistedXp.experience_level || 1),
        experience_xp: Number(persistedXp.experience_xp || 0),
      });
    }
    initPushNotifications();
  }, []);

  useEffect(() => {
    if (progress) {
      return;
    }
    const initialProgress = {
      marker: "session-started",
      updatedAt: new Date().toISOString(),
    };
    saveProgress(initialProgress, setProgress);
  }, [progress]);

  useEffect(() => {
    function onGameMessage(event) {
      const data = event && event.data;
      if (!data || typeof data !== "object") {
        return;
      }
      if (data.type === "PH_SAVE_PROGRESS") {
        const next = {
          marker: String(data.marker || "game-update"),
          updatedAt: new Date().toISOString(),
        };
        saveProgress(next, setProgress);
        pushAction("save_progress_message", { marker: next.marker });
        return;
      }
      if (event.origin !== window.location.origin && event.origin !== "") {
        return;
      }
      if (data.source !== "landnam") {
        return;
      }
      const eventName = String(data.event || "");
      const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
      if (!eventName) {
        return;
      }
      pushAction(eventName, payload);
      captureAnalyticsEvent(eventName, payload);
      if (typeof payload.experience_level !== "undefined" || typeof payload.experience_xp !== "undefined" || typeof payload.franc_balance !== "undefined") {
        const current = readXpState() || {};
        const prevLevel = Number(current.experience_level || 1);
        const snapshot = {
          experience_level: Number(
            typeof payload.experience_level !== "undefined" ? payload.experience_level : prevLevel
          ),
          experience_xp: Number(typeof payload.experience_xp !== "undefined" ? payload.experience_xp : current.experience_xp || 0),
          franc_balance: Number(typeof payload.franc_balance !== "undefined" ? payload.franc_balance : current.franc_balance || 0),
          updated_at: new Date().toISOString(),
        };
        writeXpState(snapshot);
        setXpState(snapshot);
        syncExperienceToSupabase(snapshot);
        if (snapshot.experience_level > prevLevel) {
          const hint = LEVEL_UNLOCK_HINTS[snapshot.experience_level] || null;
          setLevelUpBanner({ level: snapshot.experience_level, hint });
          vibrate([80, 60, 120]);
          clearTimeout(levelUpTimerRef.current);
          levelUpTimerRef.current = setTimeout(() => setLevelUpBanner(null), 4000);
          maybeShowLevelUpSurvey(payload);
        }
      }
      if (eventName === "mine_hit") {
        vibrate([30]);
      }
      if (eventName === "player_stuck_detected") {
        maybeShowDifficultySurvey(payload);
      }
      if (eventName === "scanner_scan_completed") {
        maybeShowScienceSurvey(payload);
        if (payload.detected_count > 0 && payload.scanner_mode === "planets") {
          maybeShowPlanetFoundSurvey(payload);
        }
      }
      if (eventName === "rocket_landed" || eventName === "first_mission_completed" || eventName === "mission_debrief_resolved") {
        vibrate([60, 40, 60]);
      }
      if (eventName === "feedback_requested") {
        showFeedbackSurvey(payload);
      }
      if (eventName === "schedule_push" && typeof window.__schedulePush === "function") {
        window.__schedulePush(
          payload.tag || "landnam",
          Number(payload.delay_ms || 0),
          { title: payload.title, body: payload.body, url: payload.url }
        );
      }
      if (eventName === "first_mission_completed" || eventName === "mission_debrief_resolved") {
        maybeTriggerFirstMissionSurvey(payload);
      }
      if (eventName === "contractor_signed") {
        maybeShowContractorSurvey(payload);
      }
      if (eventName === "mining_run_completed") {
        maybeShowMiningSurvey(payload);
      }
      if (eventName === "mission_debrief_resolved") {
        maybeShowProgressionSurvey(payload);
        maybeShowM4CompleteSurvey(payload);
      }
      if (eventName === "rocket_launched" || eventName === "mission_launch_started") {
        maybeShowLaunchSurvey(payload);
      }
      // Return-visit survey: fires the first time the player completes a meaningful
      // mechanic on their second session. We check after each completion event so
      // the survey never appears before the player has actually done something.
      if (_pendingReturnVisitSurvey && !localStorage.getItem(MICRO_SURVEY_KEYS.return_visit)) {
        const isCompletionEvent = (
          eventName === "rocket_landed" ||
          eventName === "mining_run_completed" ||
          eventName === "contractor_signed" ||
          eventName === "mission_debrief_resolved" ||
          eventName === "scanner_scan_completed"
        );
        if (isCompletionEvent) {
          _pendingReturnVisitSurvey = false;
          maybeTriggerMicroSurvey(
            MICRO_SURVEY_KEYS.return_visit,
            MICRO_SURVEY_IDS.return_visit,
            "micro_return_visit_motivation",
            payload
          );
        }
      }
    }

    window.addEventListener("message", onGameMessage);
    return () => window.removeEventListener("message", onGameMessage);
  }, []);

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    return () => {
      if (pwaHudTimerRef.current) {
        clearTimeout(pwaHudTimerRef.current);
      }
    };
  }, []);

  // Auto-show install banner on mobile non-PWA after 2s (dismissible, suppressed after dismiss)
  useEffect(() => {
    if (!isMobile || isPwa) return;
    if (localStorage.getItem("landnam_install_banner_dismissed_v1")) return;
    const timer = setTimeout(() => setShowInstallHint(true), 2000);
    return () => clearTimeout(timer);
  }, [isMobile, isPwa]);

  const handleOpenFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleInstallApp = useCallback(async () => {
    setShowInstallHint(false);
    if (isIos) {
      setShowIosHint((h) => !h);
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      try {
        const choice = await installPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setTimeout(maybeShowPwaInstallSurvey, 2000);
        }
      } catch (_error) {}
      setInstallPrompt(null);
      return;
    }
    setShowInstallHint(true);
  }, [installPrompt, isIos]);

  const revealPwaHud = useCallback(() => {
    if (!isPwa && !isMobile) return;
    setShowPwaHud(true);
    setShowPwaHudMenu(false);
    if (pwaHudTimerRef.current) {
      clearTimeout(pwaHudTimerRef.current);
    }
    pwaHudTimerRef.current = setTimeout(() => {
      setShowPwaHud(false);
      pwaHudTimerRef.current = null;
    }, 3500);
  }, [isPwa, isMobile]);

  const handleSignout = useCallback(async () => {
    try {
      const client = await loadSupabaseClient();
      await client.auth.signOut();
      setUser(null);
      captureAnalyticsEvent("logout_success");
    } catch (err) {
      console.warn("Signout failed:", err);
    }
  }, []);

  const handlePwaSave = useCallback(() => {
    const next = {
      marker: "manual-save",
      updatedAt: new Date().toISOString(),
    };
    saveProgress(next, setProgress);
    setStorageStatus("Cookie saved");
    setShowPwaHudMenu(false);
  }, []);

  const handlePwaExit = useCallback(() => {
    try {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
    } catch (_error) {}
    window.location.href = "/";
  }, []);

  const handleSkipToLevel3 = useCallback(() => {
    const next = {
      experience_level: 3,
      experience_xp: 0,
      franc_balance: 250000,
      updated_at: new Date().toISOString(),
    };
    writeXpState(next);
    setXpState(next);
    alert("Progress skipped to Level 3!");
    setShowPwaHudMenu(false);
  }, []);

  const handleInstantMining = useCallback(() => {
    // In web shell, we just pretend we triggered it and hide menu
    setShowPwaHudMenu(false);
    setShowAdvanced(false);
  }, []);

  const handleResetAll = useCallback(async () => {
    if (!window.confirm("Reset all game data? This clears your save, progress, and all local storage. Cannot be undone.")) return;
    try {
      // 1. Clear the progress cookie
      document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
      // 2. Clear all localStorage (surveys, XP, session count, action log, etc.)
      localStorage.clear();
      // 3. Clear Godot's user:// filesystem stored in IndexedDB
      if (typeof indexedDB !== "undefined" && typeof indexedDB.databases === "function") {
        const dbs = await indexedDB.databases();
        await Promise.all(dbs.map((db) => new Promise((resolve) => {
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = resolve;
          req.onerror = resolve;
          req.onblocked = resolve;
        })));
      }
      captureAnalyticsEvent("full_reset_triggered", {});
    } catch (e) {
      console.warn("[reset] Error during reset:", e);
    }
    window.location.reload();
  }, []);

  const markerText = useMemo(() => {
    if (!progress) {
      return "pending";
    }
    return `${progress.marker} @ ${progress.updatedAt}`;
  }, [progress]);

  const frameStyle = {
    width: "100%",
    height: "min(85vh, 1000px)",
    border: "0",
    display: "block",
    background: "#000",
  };
  const isCompactPwaHud = isMobile && viewportWidth <= 430;

  // Level-up celebration banner (top-centre, auto-dismisses after 4s)
  const levelUpOverlay = levelUpBanner
    ? React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            top: (isPwa || isMobile) ? "max(32px, calc(env(safe-area-inset-top) + 12px))" : "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #0f2040, #1a3a6e)",
            border: "1px solid rgba(58,106,191,0.7)",
            borderRadius: "14px",
            padding: "12px 22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            zIndex: 99998,
            pointerEvents: "none",
            boxShadow: "0 4px 32px rgba(58,106,191,0.5), 0 0 0 1px rgba(58,106,191,0.15)",
            whiteSpace: "nowrap",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#5a8fff", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" } },
          `Level ${levelUpBanner.level} Reached`
        ),
        levelUpBanner.hint
          ? React.createElement(
              "span",
              { style: { color: "#e8f0ff", fontSize: "14px", fontWeight: 700 } },
              levelUpBanner.hint
            )
          : null
      )
    : null;

  // Portrait overlay — covers the game when any handheld/tablet device is held portrait
  const rotatePrompt =
    isPortrait && viewportWidth < 1200
      ? React.createElement(
          "div",
          {
            style: {
              position: "fixed",
              inset: 0,
              background: "#05080f",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              zIndex: 99999,
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "64px",
                display: "block",
                transform: "rotate(-90deg)",
                transition: "transform 0.4s",
              },
            },
            "\uD83D\uDCF1"
          ),
          React.createElement(
            "p",
            {
              style: {
                color: "#8899cc",
                fontSize: "17px",
                textAlign: "center",
                margin: "0 40px",
                lineHeight: 1.5,
              },
            },
            "Rotate your device to landscape for the best experience"
          )
        )
      : null;

  // Landing page — shown to first-time visitors (no progress cookie). Returning players bypass it.
  if (!playing) {
    return React.createElement(LandingPage, { onPlay: () => setPlaying(true) });
  }

  // Full-screen mode: PWA installed or mobile browser — game fills entire screen, no chrome
  if (isPwa || isMobile) {
    return React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "#000",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom)",
        },
      },
      React.createElement("iframe", {
        id: "game-frame",
        src: gameSrc,
        title: "Landnám",
        allow: "fullscreen",
        style: {
          flex: 1,
          minHeight: 0,
          border: 0,
          display: "block",
          background: "#000",
          width: "100%",
        },
        onError: () => setStorageStatus("Game load error"),
        onLoad: () => {
          saveProgress({ marker: "game-loaded", updatedAt: new Date().toISOString() }, setProgress);
          setStorageStatus("Cookie saved");
        },
      }),
      React.createElement(
        "button",
        {
          onClick: revealPwaHud,
          style: {
            position: "fixed",
            bottom: "env(safe-area-inset-bottom)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(52vw, calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 16px))",
            maxWidth: "240px",
            height: "22px",
            border: "none",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
            background: "rgba(10, 18, 40, 0.55)",
            color: "rgba(200,215,255,0.7)",
            fontSize: "10px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            zIndex: 10001,
            backdropFilter: "blur(4px)",
          },
        },
        "Show HUD"
      ),
      showPwaHud
        ? React.createElement(
            "div",
            {
              style: {
                position: "fixed",
                bottom: "calc(env(safe-area-inset-bottom) + 24px)",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "8px",
                zIndex: 10002,
                background: "rgba(5, 8, 15, 0.92)",
                border: "1px solid #2a3560",
                borderRadius: "12px",
                padding: "8px",
                maxWidth: "calc(100vw - env(safe-area-inset-left) - env(safe-area-inset-right) - 16px)",
              },
            },
            isCompactPwaHud
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "div",
                    { style: { display: "flex", gap: "10px", alignItems: "center", marginRight: "10px" } },
                    React.createElement("span", { style: { color: "#fff", fontSize: "12px" } }, `Lvl ${xpState.experience_level}`),
                    React.createElement("span", { style: { color: "#4ad0ff", fontSize: "12px" } }, `${Math.round(xpState.franc_balance / 1000)}K F`)
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: () => {
                        setShowPwaHudMenu((open) => !open);
                        if (pwaHudTimerRef.current) {
                          clearTimeout(pwaHudTimerRef.current);
                        }
                        if (!showPwaHudMenu) {
                          // Keep open while menu is shown
                        } else {
                          pwaHudTimerRef.current = setTimeout(() => {
                            setShowPwaHud(false);
                            setShowPwaHudMenu(false);
                            pwaHudTimerRef.current = null;
                          }, 3500);
                        }
                      },
                      style: {
                        border: "1px solid #2a3560",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        color: "#fff",
                        background: "#1a2550",
                        fontSize: "12px",
                      },
                    },
                    "Exit to Menu"
                  ),
                  showPwaHudMenu
                    ? React.createElement(
                        "div",
                        {
                          style: {
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            marginTop: "8px",
                            padding: "8px",
                            borderTop: "1px solid #233455",
                          },
                        },
                        React.createElement(
                          "button",
                          {
                            onClick: handlePwaSave,
                            style: {
                              border: "1px solid #2a3560",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "#fff",
                              background: "#14204a",
                              fontSize: "12px",
                            },
                          },
                          "Save"
                        ),
                        !isPwa && React.createElement(
                          "button",
                          {
                            onClick: handleOpenFullscreen,
                            style: {
                              border: "1px solid #2a3560",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "#fff",
                              background: "#1a2550",
                              fontSize: "12px",
                            },
                          },
                          "Open Fullscreen"
                        ),
                        !isPwa && (installPrompt || isIos) && React.createElement(
                          "button",
                          {
                            onClick: handleInstallApp,
                            style: {
                              border: "1px solid #2a3560",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "#fff",
                              background: "#0e4a2e",
                              fontSize: "12px",
                            },
                          },
                          isIos ? "Add to Home Screen" : "Install App"
                        ),
                        React.createElement(
                          "button",
                          {
                            onClick: user ? handleSignout : () => setShowAuth(true),
                            style: {
                              border: "1px solid #2a3560",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "#fff",
                              background: user ? "#3a1724" : "#14204a",
                              fontSize: "12px",
                            },
                          },
                          user ? "Sign Out" : "Sign In"
                        ),
                        React.createElement(
                          "button",
                          {
                            onClick: handlePwaExit,
                            style: {
                              border: "1px solid #2a3560",
                              borderRadius: "8px",
                              padding: "8px 10px",
                              color: "#fff",
                              background: "#3a1724",
                              fontSize: "12px",
                            },
                          },
                          "Exit"
                        ),
                        React.createElement(
                          "button",
                          {
                            onClick: () => setShowAdvanced(!showAdvanced),
                            style: {
                              background: "none",
                              border: "none",
                              color: "#007AFF",
                              textDecoration: "underline",
                              fontSize: "12px",
                              marginTop: "4px",
                              cursor: "pointer",
                            },
                          },
                          showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"
                        ),
                        showAdvanced && React.createElement(
                          React.Fragment,
                          null,
                          React.createElement(
                            "button",
                            {
                              onClick: handleInstantMining,
                              style: {
                                border: "1px solid #FF9F0A",
                                borderRadius: "8px",
                                padding: "8px 10px",
                                color: "#fff",
                                background: "#FF9F0A",
                                fontSize: "11px",
                              },
                            },
                            "🚀 Instant Mining (Auto-Setup)"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: handleSkipToLevel3,
                              style: {
                                border: "1px solid #64D2FF",
                                borderRadius: "8px",
                                padding: "8px 10px",
                                color: "#fff",
                                background: "#64D2FF",
                                fontSize: "11px",
                              },
                            },
                            "📈 Skip to Level 3 (Unlock Missions)"
                          ),
                          React.createElement(
                            "button",
                            {
                              onClick: handleResetAll,
                              style: {
                                border: "1px solid #ff453a",
                                borderRadius: "8px",
                                padding: "8px 10px",
                                color: "#fff",
                                background: "#3a0f0d",
                                fontSize: "11px",
                                marginTop: "4px",
                              },
                            },
                            "🗑 Reset All Game Data"
                          )
                        )
                      )
                    : null
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "div",
                    { style: { display: "flex", gap: "10px", alignItems: "center", marginRight: "10px" } },
                    React.createElement("span", { style: { color: "#fff", fontSize: "13px", fontWeight: "bold" } }, `Lvl ${xpState.experience_level}`),
                    React.createElement("span", { style: { color: "#4ad0ff", fontSize: "13px", fontWeight: "bold" } }, `${Math.round(xpState.franc_balance / 1000)}K F`)
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: handlePwaSave,
                      style: {
                        border: "1px solid #2a3560",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        color: "#fff",
                        background: "#14204a",
                        fontSize: "12px",
                      },
                    },
                    "Save"
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: () => {
                        setShowPwaHudMenu(!showPwaHudMenu);
                        if (pwaHudTimerRef.current) clearTimeout(pwaHudTimerRef.current);
                      },
                      style: {
                        border: "1px solid #2a3560",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        color: "#fff",
                        background: "#1a2550",
                        fontSize: "12px",
                      },
                    },
                    "Exit to Menu"
                  ),
                  showPwaHudMenu && React.createElement(
                    "div",
                    {
                      style: {
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "8px",
                        background: "rgba(5, 8, 15, 0.95)",
                        border: "1px solid #233455",
                        borderRadius: "12px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        minWidth: "200px",
                      },
                    },
                    !isPwa && React.createElement(
                      "button",
                      {
                        onClick: handleOpenFullscreen,
                        style: {
                          border: "1px solid #2a3560",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          color: "#fff",
                          background: "#1a2550",
                          fontSize: "12px",
                        },
                      },
                      "Open Fullscreen"
                    ),
                    !isPwa && (installPrompt || isIos) && React.createElement(
                      "button",
                      {
                        onClick: handleInstallApp,
                        style: {
                          border: "1px solid #2a3560",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          color: "#fff",
                          background: "#0e4a2e",
                          fontSize: "12px",
                        },
                      },
                      isIos ? "Add to Home Screen" : "Install App"
                    ),
                    React.createElement(
                      "button",
                      {
                        onClick: handlePwaExit,
                        style: {
                          border: "1px solid #2a3560",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          color: "#fff",
                          background: "#3a1724",
                          fontSize: "12px",
                        },
                      },
                      "Exit Game"
                    ),
                    React.createElement(
                      "button",
                      {
                        onClick: () => setShowAdvanced(!showAdvanced),
                        style: {
                          background: "none",
                          border: "none",
                          color: "#007AFF",
                          textDecoration: "underline",
                          fontSize: "12px",
                          cursor: "pointer",
                        },
                      },
                      showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"
                    ),
                    showAdvanced && React.createElement(
                      React.Fragment,
                      null,
                      React.createElement(
                        "button",
                        {
                          onClick: handleInstantMining,
                          style: {
                            border: "1px solid #FF9F0A",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#fff",
                            background: "#FF9F0A",
                            fontSize: "11px",
                          },
                        },
                        "🚀 Instant Mining (Auto-Setup)"
                      ),
                      React.createElement(
                        "button",
                        {
                          onClick: handleSkipToLevel3,
                          style: {
                            border: "1px solid #64D2FF",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#fff",
                            background: "#64D2FF",
                            fontSize: "11px",
                          },
                        },
                        "📈 Skip to Level 3 (Unlock Missions)"
                      ),
                      React.createElement(
                        "button",
                        {
                          onClick: handleResetAll,
                          style: {
                            border: "1px solid #ff453a",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            color: "#fff",
                            background: "#3a0f0d",
                            fontSize: "11px",
                            marginTop: "4px",
                          },
                        },
                        "🗑 Reset All Game Data"
                      )
                    )
                  )
                )
          )
        : null,
      rotatePrompt,
      levelUpOverlay,
      showInstallHint && !isPwa
        ? React.createElement(
            "div",
            {
              style: {
                position: "fixed",
                top: "max(16px, env(safe-area-inset-top))",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(5, 8, 15, 0.92)",
                border: "1px solid #2a3560",
                borderRadius: "12px",
                padding: "10px 14px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                zIndex: 10003,
                backdropFilter: "blur(8px)",
                whiteSpace: "nowrap",
              },
            },
            React.createElement(
              "button",
              {
                onClick: handleOpenFullscreen,
                style: {
                  border: "1px solid #2a3560",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: "#fff",
                  background: "#1a2550",
                  fontSize: "12px",
                  cursor: "pointer",
                },
              },
              "Open Fullscreen"
            ),
            React.createElement(
              "button",
              {
                onClick: () => {
                  setShowInstallHint(false);
                  localStorage.setItem("landnam_install_banner_dismissed_v1", "1");
                },
                style: {
                  border: "none",
                  background: "none",
                  color: "rgba(200,215,255,0.6)",
                  fontSize: "16px",
                  cursor: "pointer",
                  padding: "4px 6px",
                  lineHeight: 1,
                },
              },
              "\u00d7"
            )
          )
        : null
    );
  }

  // Desktop layout — mobile always takes the full-screen path above
  return React.createElement(
    "main",
    {
      style: { maxWidth: "1200px", margin: "0 auto", padding: "20px" },
    },
    React.createElement(
      "header",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "24px",
          marginBottom: "20px",
        },
      },
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "p",
          {
            style: {
              margin: "0 0 6px",
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              fontWeight: 600,
            },
          },
          "Landnám"
        ),
        React.createElement(
          "h1",
          {
            style: {
              margin: "0 0 8px",
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.01em",
              fontWeight: 800,
              lineHeight: 1.1,
              color: "var(--ink)",
            },
          },
          "Landnám"
        ),
        React.createElement(
          "p",
          {
            style: {
              margin: 0,
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.5,
            },
          },
          "Mine asteroids \u00b7 Build settlements \u00b7 Discover real planets"
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
            flexShrink: 0,
            paddingTop: "4px",
          },
        },
        (xpState.experience_level > 1 || xpState.franc_balance > 0)
          ? React.createElement(
              "div",
              { style: { display: "flex", gap: "6px", alignItems: "center" } },
              React.createElement(
                "span",
                {
                  style: {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--edge)",
                    borderRadius: "6px",
                    padding: "3px 10px",
                    fontSize: "13px",
                    color: "var(--ink)",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  },
                },
                `Lv ${xpState.experience_level}`
              ),
              React.createElement(
                "span",
                {
                  style: {
                    background: "rgba(74,208,255,0.07)",
                    border: "1px solid rgba(74,208,255,0.25)",
                    borderRadius: "6px",
                    padding: "3px 10px",
                    fontSize: "13px",
                    color: "var(--accent)",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  },
                },
                `${Math.round(xpState.franc_balance).toLocaleString()} F`
              )
            )
          : null,
        storageStatus === "Game load error"
          ? React.createElement(
              "span",
              {
                style: {
                  fontSize: "12px",
                  color: "#ff6b6b",
                  padding: "2px 8px",
                  background: "rgba(255,60,60,0.1)",
                  border: "1px solid rgba(255,60,60,0.3)",
                  borderRadius: "4px",
                },
              },
              "Game load error"
            )
          : null,
        React.createElement(
          "div",
          { style: { display: "flex", gap: "8px" } },
          React.createElement(
            "button",
            {
              style: {
                border: "1px solid var(--edge)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "13px",
                color: "var(-- ink)",
                background: user ? "rgba(255,69,58,0.1)" : "rgba(74,208,255,0.1)",
                cursor: "pointer",
              },
              onClick: user ? handleSignout : () => setShowAuth(true),
            },
            user ? `Sign Out (${user.email})` : "Sign In"
          ),
          React.createElement(
            "button",
            {
              style: {
                border: "1px solid var(--edge)",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "13px",
                color: storageStatus === "Saved \u2713" || storageStatus === "Cookie saved" ? "var(--accent)" : "var(--muted)",
                background: "transparent",
                cursor: "pointer",
              },
              onClick: () => {
                const next = {
                  marker: "manual-save",
                  updatedAt: new Date().toISOString(),
                };
                saveProgress(next, setProgress);
                setStorageStatus("Saved \u2713");
              },
            },
            storageStatus === "Saved \u2713" || storageStatus === "Cookie saved" ? "Saved \u2713" : "Save Progress"
          ),
          installPrompt
            ? React.createElement(
                "button",
                {
                  style: {
                    border: "1px solid #2a5040",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    color: "#6fd4b0",
                    background: "#0e2420",
                    cursor: "pointer",
                  },
                  onClick: handleInstallApp,
                },
                "Install App"
              )
            : null
        )
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          border: "1px solid var(--edge)",
          borderRadius: "14px",
          overflow: "hidden",
          background: "linear-gradient(180deg, #0f1729, #090e19)",
          boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35)",
        },
      },
      React.createElement("iframe", {
        id: "game-frame",
        src: gameSrc,
        title: "Landnám",
        allow: "fullscreen",
        style: frameStyle,
        onError: () => {
          setStorageStatus("Game load error");
        },
        onLoad: () => {
          const next = {
            marker: "game-loaded",
            updatedAt: new Date().toISOString(),
          };
          saveProgress(next, setProgress);
          setStorageStatus("Cookie saved");
        },
      })
    ),
    rotatePrompt,
    levelUpOverlay,
    React.createElement(AuthModal, {
      isOpen: showAuth,
      onClose: () => setShowAuth(false),
      onAuthSuccess: (u) => setUser(u),
    })
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
