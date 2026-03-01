/* eslint-env browser */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@19";
import { createRoot } from "https://esm.sh/react-dom@19/client";

const COOKIE_NAME = "planet_hunters_progress_v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ACTION_LOG_KEY = "planet_hunters_action_log_v1";
const SURVEY_SHOWN_KEY = "planet_hunters_exit_survey_first_mission_v1";
const SURVEY_OVERLAY_ID = "planet-hunters-survey-overlay";
const SURVEY_IFRAME_ID = "planet-hunters-survey-iframe";
const FEEDBACK_OVERLAY_ID = "planet-hunters-feedback-overlay";
const SUPABASE_SESSION_STORAGE_KEY = "planet_hunters_supabase_guest";
const XP_STATE_KEY = "planet_hunters_xp_state_v1";
const DEFAULT_RUNTIME_CONFIG = {
  posthog: {
    projectToken: "phc_65umDftbbTkrm1V6azue6OeU4u5c8iJcaHm4JtJ95di",
    apiHost: "https://us.i.posthog.com",
    uiHost: "https://us.posthog.com",
    surveyId: "019c603e-d236-0000-85ce-f507635d2311",
  },
  supabase: {
    url: "https://hlufptwhzkpkkjztimzo.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWZwdHdoemtwa2tqenRpbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyOTk3NTUsImV4cCI6MjAzMTg3NTc1NX0.v_NDVWjIU_lJQSPbJ_Y6GkW3axrQWKXfXVsBEAbFv_I",
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

const LEVEL_UNLOCK_HINTS = {
  2: "Longer range unlocked",
  3: "Faster mining speed unlocked",
  4: "Cargo capacity increased",
  5: "Advanced scanner unlocked",
};

function vibrate(pattern) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

function isPwaMode() {
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
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
        session_recording: {
          maskAllInputs: false,
          recordCrossOriginIframes: true,
        },
        loaded(ph) {
          ph.register({
            app: "planet_hunters_experiment1_web",
            runtime: "godot_web_shell",
          });
        },
      });
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
      source: "planet_hunters_experiment1_web",
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
        source: "planet_hunters_experiment1_web",
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
    const distinctId = await ensureGuestUser();
    syncAnalyticsIdentity(distinctId);
    return distinctId;
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

function removeFeedbackOverlay() {
  const existing = document.getElementById(FEEDBACK_OVERLAY_ID);
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
}

function showFeedbackDialog(context = {}) {
  removeFeedbackOverlay();

  const overlay = document.createElement("div");
  overlay.id = FEEDBACK_OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(2, 6, 15, 0.78)";
  overlay.style.zIndex = "2147482647";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const card = document.createElement("form");
  card.style.width = "min(560px, 100%)";
  card.style.background = "#08111d";
  card.style.border = "1px solid #233455";
  card.style.borderRadius = "18px";
  card.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.45)";
  card.style.padding = "22px";
  card.style.display = "grid";
  card.style.gap = "12px";

  const title = document.createElement("h2");
  title.textContent = "Where did you get stuck?";
  title.style.margin = "0";
  title.style.fontSize = "24px";
  title.style.color = "#e7edf9";

  const intro = document.createElement("p");
  intro.textContent = "Send quick feedback with your current context. We will line it up with replay and gameplay events.";
  intro.style.margin = "0";
  intro.style.color = "#a9b4cc";
  intro.style.lineHeight = "1.5";

  const blockerSelect = document.createElement("select");
  blockerSelect.innerHTML = [
    '<option value="navigation">I could not tell where to go</option>',
    '<option value="mining">Mining felt too hard or unclear</option>',
    '<option value="targeting">I did not understand target choice</option>',
    '<option value="economy">Rewards or progression felt confusing</option>',
    '<option value="bug">Something looked broken</option>',
  ].join("");

  const severitySelect = document.createElement("select");
  severitySelect.innerHTML = [
    '<option value="minor">Minor friction</option>',
    '<option value="major">Major blocker</option>',
    '<option value="quit_risk">I was close to quitting</option>',
  ].join("");

  const expectation = document.createElement("textarea");
  expectation.rows = 5;
  expectation.placeholder = "What were you trying to do, and what did you expect to happen?";
  expectation.style.resize = "vertical";

  const details = document.createElement("textarea");
  details.rows = 4;
  details.placeholder = "Anything else? Controls, tutorial, pacing, unclear text, bugs.";
  details.style.resize = "vertical";

  [blockerSelect, severitySelect, expectation, details].forEach((element) => {
    element.style.width = "100%";
    element.style.boxSizing = "border-box";
    element.style.borderRadius = "12px";
    element.style.border = "1px solid #30496f";
    element.style.background = "#101c30";
    element.style.color = "#e7edf9";
    element.style.padding = "12px";
    element.style.font = "inherit";
  });

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "space-between";
  footer.style.gap = "12px";
  footer.style.flexWrap = "wrap";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close";
  closeBtn.style.border = "1px solid #30496f";
  closeBtn.style.background = "#12213a";
  closeBtn.style.color = "#dce7fb";
  closeBtn.style.padding = "10px 14px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.onclick = () => {
    removeFeedbackOverlay();
    pushAction("feedback_dialog_closed", context);
    captureAnalyticsEvent("feedback_dialog_closed", context);
  };

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Send feedback";
  submitBtn.style.border = "0";
  submitBtn.style.background = "#4ad0ff";
  submitBtn.style.color = "#04101a";
  submitBtn.style.padding = "10px 16px";
  submitBtn.style.borderRadius = "999px";
  submitBtn.style.fontWeight = "700";
  submitBtn.style.cursor = "pointer";

  footer.appendChild(closeBtn);
  footer.appendChild(submitBtn);

  card.appendChild(title);
  card.appendChild(intro);
  card.appendChild(blockerSelect);
  card.appendChild(severitySelect);
  card.appendChild(expectation);
  card.appendChild(details);
  card.appendChild(footer);

  card.onsubmit = async (event) => {
    event.preventDefault();
    const distinctId = await resolveSurveyDistinctId();
    const payload = {
      ...context,
      distinct_id: distinctId,
      blocker_type: blockerSelect.value,
      blocker_severity: severitySelect.value,
      expectation_text: expectation.value.trim(),
      detail_text: details.value.trim(),
      recent_actions_json: buildProgressJson({ feedback_context: context }),
    };
    pushAction("player_feedback_submitted", payload);
    captureAnalyticsEvent("player_feedback_submitted", payload);
    removeFeedbackOverlay();
  };

  overlay.appendChild(card);
  document.body.appendChild(overlay);
  pushAction("feedback_dialog_opened", context);
  captureAnalyticsEvent("feedback_dialog_opened", context);
}

async function showInlineSurvey(params) {
  const runtimeConfig = await getRuntimeConfig();
  const surveyId = runtimeConfig.posthog.surveyId;
  const surveyUrl = `${runtimeConfig.posthog.uiHost}/external_surveys/${surveyId}`;
  removeSurveyOverlay();

  const overlay = document.createElement("div");
  overlay.id = SURVEY_OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(2, 6, 15, 0.78)";
  overlay.style.zIndex = "2147482646";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const card = document.createElement("div");
  card.style.width = "min(860px, 100%)";
  card.style.height = "min(88vh, 900px)";
  card.style.background = "#0c1220";
  card.style.border = "1px solid #233455";
  card.style.borderRadius = "14px";
  card.style.overflow = "hidden";
  card.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.45)";
  card.style.position = "relative";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "10px";
  closeBtn.style.right = "10px";
  closeBtn.style.border = "1px solid #30496f";
  closeBtn.style.background = "#12213a";
  closeBtn.style.color = "#dce7fb";
  closeBtn.style.padding = "6px 12px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.zIndex = "2";
  closeBtn.onclick = function closeSurvey() {
    removeSurveyOverlay();
    pushAction("survey_closed", {});
    captureAnalyticsEvent("survey_closed", { survey_id: surveyId });
  };

  const iframe = document.createElement("iframe");
  iframe.id = SURVEY_IFRAME_ID;
  iframe.src = `${surveyUrl}?${new URLSearchParams(params).toString()}`;
  iframe.title = "Experiment 1 Exit Survey";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.allow = "fullscreen";

  card.appendChild(closeBtn);
  card.appendChild(iframe);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  pushAction("survey_opened", {
    survey_id: surveyId,
    mission_count: params.mission_count || "",
    supabase_guest_id: params.supabase_guest_id || "",
  });
  captureAnalyticsEvent("survey_opened", {
    survey_id: surveyId,
    mission_count: params.mission_count || "",
  });
}

async function maybeTriggerFirstMissionSurvey(eventPayload) {
  if (_surveyShownInThisBoot) return;
  if (localStorage.getItem(SURVEY_SHOWN_KEY)) return;

  try {
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
    await showInlineSurvey(params);
    _surveyShownInThisBoot = true;
    localStorage.setItem(SURVEY_SHOWN_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Failed to trigger first mission survey:", error);
    pushAction("survey_trigger_error", {
      message: String(error && error.message ? error.message : error),
    });
  }
}

function App() {
  const [progress, setProgress] = useState(() => parseProgress(readCookie(COOKIE_NAME)));
  const [storageStatus, setStorageStatus] = useState("Cookie storage active");
  const [gameSrc] = useState("/game/index.html");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [isPwa] = useState(() => isPwaMode());
  const [isIos] = useState(() => isIosDevice());
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showMobileBanner, setShowMobileBanner] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [levelUpBanner, setLevelUpBanner] = useState(null); // { level, hint }
  const levelUpTimerRef = useRef(null);
  const [isPortrait, setIsPortrait] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches
  );

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
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
    const persistedXp = readXpState();
    if (persistedXp && typeof persistedXp.experience_level !== "undefined") {
      registerAnalyticsContext({
        experience_level: Number(persistedXp.experience_level || 1),
        experience_xp: Number(persistedXp.experience_xp || 0),
      });
    }
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
      if (event.origin !== window.location.origin) {
        return;
      }
      if (data.source !== "planet-hunters") {
        return;
      }
      const eventName = String(data.event || "");
      const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
      if (!eventName) {
        return;
      }
      pushAction(eventName, payload);
      captureAnalyticsEvent(eventName, payload);
      if (typeof payload.experience_level !== "undefined" || typeof payload.experience_xp !== "undefined") {
        const current = readXpState() || {};
        const prevLevel = Number(current.experience_level || 1);
        const snapshot = {
          experience_level: Number(
            typeof payload.experience_level !== "undefined" ? payload.experience_level : prevLevel
          ),
          experience_xp: Number(typeof payload.experience_xp !== "undefined" ? payload.experience_xp : current.experience_xp || 0),
          updated_at: new Date().toISOString(),
        };
        writeXpState(snapshot);
        syncExperienceToSupabase(snapshot);
        if (snapshot.experience_level > prevLevel) {
          const hint = LEVEL_UNLOCK_HINTS[snapshot.experience_level] || null;
          setLevelUpBanner({ level: snapshot.experience_level, hint });
          vibrate([80, 60, 120]);
          clearTimeout(levelUpTimerRef.current);
          levelUpTimerRef.current = setTimeout(() => setLevelUpBanner(null), 4000);
        }
      }
      if (eventName === "mine_hit") {
        vibrate([30]);
      }
      if (eventName === "rocket_landed" || eventName === "first_mission_completed" || eventName === "mission_debrief_resolved") {
        vibrate([60, 40, 60]);
      }
      if (eventName === "feedback_requested") {
        showFeedbackDialog(payload);
      }
      if (eventName === "first_mission_completed" || eventName === "mission_debrief_resolved") {
        maybeTriggerFirstMissionSurvey(payload);
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
    if (isMobile && !isPwa) {
      const t = setTimeout(() => setShowMobileBanner(true), 2000);
      return () => clearTimeout(t);
    }
  }, [isMobile, isPwa]);

  const handleOpenFullscreen = useCallback(() => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setShowMobileBanner(false);
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (isIos) {
      setShowIosHint((h) => !h);
      return;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
    }
    setShowMobileBanner(false);
  }, [installPrompt, isIos]);

  const markerText = useMemo(() => {
    if (!progress) {
      return "pending";
    }
    return `${progress.marker} @ ${progress.updatedAt}`;
  }, [progress]);

  const frameStyle = {
    width: "100%",
    height: isMobile ? "100svh" : "min(75vh, 860px)",
    border: "0",
    display: "block",
    background: "#000",
  };

  // Level-up celebration banner (top-centre, auto-dismisses after 4s)
  const levelUpOverlay = levelUpBanner
    ? React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #1a3a6e, #0f2040)",
            border: "1px solid #3a6abf",
            borderRadius: "12px",
            padding: "14px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            zIndex: 99998,
            pointerEvents: "none",
            boxShadow: "0 4px 24px rgba(58,106,191,0.4)",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#a0c0ff", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" } },
          `Level ${levelUpBanner.level} reached`
        ),
        levelUpBanner.hint
          ? React.createElement(
              "span",
              { style: { color: "#ffffff", fontSize: "15px", fontWeight: 700 } },
              levelUpBanner.hint
            )
          : null
      )
    : null;

  // Portrait overlay — covers the game when a mobile device is held portrait
  const rotatePrompt =
    isMobile && isPortrait
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

  // PWA mode: minimal chrome — slim header + game fills remaining height
  if (isPwa) {
    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", height: "100svh", background: "#000" } },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "6px 14px",
            background: "#05080f",
            borderBottom: "1px solid #1a2340",
            flexShrink: 0,
          },
        },
        React.createElement(
          "button",
          {
            style: {
              background: "none",
              border: "1px solid #2a3560",
              color: "#8899cc",
              borderRadius: "6px",
              padding: "4px 12px",
              cursor: "pointer",
              fontSize: "13px",
            },
            onClick: () => {
              if (document.exitFullscreen && document.fullscreenElement) {
                document.exitFullscreen();
              }
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.close();
              }
            },
          },
          "\u2190 Exit"
        ),
        React.createElement(
          "span",
          { style: { color: "#6677aa", fontSize: "13px" } },
          "Star Sailors: Experiment 1"
        )
      ),
      React.createElement("iframe", {
        id: "game-frame",
        src: gameSrc,
        title: "Planet Hunters Game",
        allow: "fullscreen",
        style: { flex: 1, border: 0, display: "block", background: "#000", width: "100%" },
        onError: () => setStorageStatus("Game load error"),
        onLoad: () => {
          saveProgress({ marker: "game-loaded", updatedAt: new Date().toISOString() }, setProgress);
          setStorageStatus("Cookie saved");
        },
      }),
      rotatePrompt,
      levelUpOverlay
    );
  }

  // Mobile banner: shown after 2s on mobile non-PWA
  const mobileBanner =
    isMobile && showMobileBanner
      ? React.createElement(
          "div",
          {
            style: {
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#05080f",
              borderTop: "1px solid #1a2340",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              zIndex: 9999,
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", gap: "8px" } },
            React.createElement(
              "button",
              {
                style: {
                  flex: 1,
                  padding: "10px",
                  background: "#1a2a5e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                },
                onClick: handleOpenFullscreen,
              },
              "Open Fullscreen"
            ),
            isIos || installPrompt
              ? React.createElement(
                  "button",
                  {
                    style: {
                      flex: 1,
                      padding: "10px",
                      background: "#1e3a1a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      cursor: "pointer",
                    },
                    onClick: handleInstallApp,
                  },
                  isIos ? "Add to Home Screen" : "Install App"
                )
              : null,
            React.createElement(
              "button",
              {
                style: {
                  padding: "10px 14px",
                  background: "none",
                  color: "#6677aa",
                  border: "1px solid #2a3560",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                },
                onClick: () => setShowMobileBanner(false),
              },
              "\u00d7"
            )
          ),
          showIosHint
            ? React.createElement(
                "p",
                { style: { margin: 0, fontSize: "13px", color: "#8899cc", textAlign: "center" } },
                "Tap the Share button (\uD83D\uDCE4) then \u201cAdd to Home Screen\u201d"
              )
            : null
        )
      : null;

  return React.createElement(
    "main",
    { style: isMobile ? { margin: 0, padding: 0 } : { maxWidth: "1200px", margin: "0 auto", padding: "20px" } },
    !isMobile && React.createElement(
      "h1",
      { style: { margin: "0 0 8px", fontSize: "clamp(24px, 4vw, 38px)", letterSpacing: "0.02em" } },
      "Star Sailors: Experiment 1"
    ),
    !isMobile && React.createElement(
      "p",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 14px",
          margin: "0 0 14px",
          color: "var(--muted)",
          fontSize: "14px",
        },
      },
      React.createElement(
        "span",
        { style: { border: "1px solid var(--edge)", borderRadius: "999px", padding: "6px 10px" } },
        "Build: Godot Web"
      ),
      React.createElement(
        "span",
        { style: { border: "1px solid var(--edge)", borderRadius: "999px", padding: "6px 10px", color: "var(--accent)" } },
        storageStatus
      ),
      React.createElement(
        "span",
        { style: { border: "1px solid var(--edge)", borderRadius: "999px", padding: "6px 10px" } },
        `Progress: ${markerText}`
      ),
      React.createElement(
        "span",
        { style: { border: "1px solid var(--edge)", borderRadius: "999px", padding: "6px 10px" } },
        `Game path: ${gameSrc}`
      ),
      React.createElement(
        "button",
        {
          style: {
            border: "1px solid var(--edge)",
            borderRadius: "999px",
            padding: "6px 12px",
            color: "var(--ink)",
            background: "transparent",
            cursor: "pointer",
          },
          onClick: () => {
            const next = {
              marker: "manual-save",
              updatedAt: new Date().toISOString(),
            };
            saveProgress(next, setProgress);
            setStorageStatus("Cookie saved");
          },
        },
        "Save Progress"
      )
    ),
    React.createElement(
      "div",
      {
        style: isMobile
          ? { overflow: "hidden", background: "#000" }
          : {
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
        title: "Planet Hunters Game",
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
    mobileBanner,
    rotatePrompt,
    levelUpOverlay
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
