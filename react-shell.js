/* eslint-env browser */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "https://esm.sh/react@19";
import { createRoot } from "https://esm.sh/react-dom@19/client";

const COOKIE_NAME = "planet_hunters_progress_v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ACTION_LOG_KEY = "planet_hunters_action_log_v1";
const SURVEY_SHOWN_KEY = "planet_hunters_exit_survey_first_mission_v1";
const MICRO_SURVEY_KEYS = {
  contractor:   "planet_hunters_micro_survey_contractor_v1",
  mining:       "planet_hunters_micro_survey_mining_v1",
  science:      "planet_hunters_micro_survey_science_v1",
  progression2: "planet_hunters_micro_survey_progression_stage2_v1",
  progression3: "planet_hunters_micro_survey_progression_stage3_v1",
  progression4: "planet_hunters_micro_survey_progression_stage4_v1",
  launch:       "planet_hunters_micro_survey_first_launch_v1",
  pwa_install:  "planet_hunters_micro_survey_pwa_install_v1",
  m4_complete:  "planet_hunters_micro_survey_m4_complete_v1",
  return_visit: "planet_hunters_micro_survey_return_visit_v1",
  level_up:     "planet_hunters_micro_survey_level_up_v1",
  upgrade:      "planet_hunters_micro_survey_upgrade_v1",
  planet_found: "planet_hunters_micro_survey_planet_found_v1",
  difficulty:   "planet_hunters_micro_survey_difficulty_v1",
};
const SESSION_COUNT_KEY = "planet_hunters_session_count_v1";
const MICRO_SURVEY_IDS = {
  contractor:  "019ccaf8-4299-0000-b3ad-92a57ab75b95",
  mining:      "019ccaf8-c4d8-0000-901b-aa850dfd43c5",
  science:     "019ccaf9-0259-0000-d411-e11fdc643d97",
  progression: "019ccaf9-3453-0000-b6b9-0e41fcae8f1c",
  // New surveys — create in PostHog and paste IDs here:
  launch:      "",  // "How did your first launch feel?" — fires after rocket_launched (M1)
  pwa_install: "",  // "Why did you install the app?" — fires after PWA install prompt accepted
  m4_complete: "",  // "You've reached the end — what would keep you playing?" — fires at M4 debrief
  return_visit: "", // "What brought you back?" — fires on 2nd+ session start
  level_up:     "", // "How does the progression speed feel?" — fires after level up
  upgrade:      "", // "Was this upgrade worth the price?" — fires after room upgrade
  planet_found: "", // "How exciting was it to find your first planet?" — fires after planet candidate found
  difficulty:   "", // "What part of the mission was most difficult?" — fires after failed/stuck run
};
const SURVEY_OVERLAY_ID = "landnam-survey-overlay";
const SURVEY_IFRAME_ID = "landnam-survey-iframe";
const FEEDBACK_OVERLAY_ID = "landnam-feedback-overlay";
const SUPABASE_SESSION_STORAGE_KEY = "planet_hunters_supabase_guest";
const XP_STATE_KEY = "planet_hunters_xp_state_v1";
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
  overlay.style.background = "rgba(2, 6, 15, 0.85)";
  overlay.style.zIndex = "2147482647";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";
  overlay.style.boxSizing = "border-box";

  const card = document.createElement("form");
  card.style.width = "min(560px, 100%)";
  card.style.maxHeight = "min(calc(100svh - 32px), 800px)";
  card.style.background = "#08111d";
  card.style.border = "1px solid #233455";
  card.style.borderRadius = "18px";
  card.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.6)";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.overflow = "hidden";
  card.style.boxSizing = "border-box";

  const cardBody = document.createElement("div");
  cardBody.style.padding = "24px 24px 12px";
  cardBody.style.display = "grid";
  cardBody.style.gap = "12px";
  cardBody.style.overflowY = "auto";
  cardBody.style.flex = "1";
  cardBody.style.boxSizing = "border-box";
  cardBody.style.webkitOverflowScrolling = "touch";

  const title = document.createElement("h2");
  title.textContent = "Where did you get stuck?";
  title.style.margin = "0";
  title.style.fontSize = "22px";
  title.style.color = "#e7edf9";
  title.style.fontWeight = "700";

  const intro = document.createElement("p");
  intro.textContent = "Send quick feedback with your current context. We will line it up with replay and gameplay events.";
  intro.style.margin = "0";
  intro.style.color = "#a9b4cc";
  intro.style.lineHeight = "1.5";
  intro.style.fontSize = "14px";

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
  expectation.rows = 3;
  expectation.placeholder = "What were you trying to do, and what did you expect to happen?";
  expectation.style.resize = "vertical";

  const details = document.createElement("textarea");
  details.rows = 2;
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
    element.style.fontSize = "15px";
    element.style.fontFamily = "inherit";
  });

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "space-between";
  footer.style.gap = "12px";
  footer.style.flexWrap = "wrap";
  footer.style.padding = "16px 24px 20px";
  footer.style.borderTop = "1px solid #1a2a44";
  footer.style.background = "#0a1626";
  footer.style.boxSizing = "border-box";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close";
  closeBtn.style.border = "1px solid #30496f";
  closeBtn.style.background = "#12213a";
  closeBtn.style.color = "#dce7fb";
  closeBtn.style.padding = "10px 20px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "14px";
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
  submitBtn.style.padding = "10px 24px";
  submitBtn.style.borderRadius = "999px";
  submitBtn.style.fontWeight = "700";
  submitBtn.style.cursor = "pointer";
  submitBtn.style.fontSize = "14px";

  footer.appendChild(closeBtn);
  footer.appendChild(submitBtn);

  cardBody.appendChild(title);
  cardBody.appendChild(intro);
  cardBody.appendChild(blockerSelect);
  cardBody.appendChild(severitySelect);
  cardBody.appendChild(expectation);
  cardBody.appendChild(details);
  
  card.appendChild(cardBody);
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

async function showInlineSurvey(params, surveyIdOverride) {
  const runtimeConfig = await getRuntimeConfig();
  const surveyId = surveyIdOverride || runtimeConfig.posthog.surveyId;
  const surveyUrl = `${runtimeConfig.posthog.uiHost}/external_surveys/${surveyId}`;
  removeSurveyOverlay();

  const overlay = document.createElement("div");
  overlay.id = SURVEY_OVERLAY_ID;
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(2, 6, 15, 0.85)";
  overlay.style.zIndex = "2147482646";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "min(20px, 4vw)";
  overlay.style.boxSizing = "border-box";

  const card = document.createElement("div");
  card.style.width = "min(860px, 100%)";
  card.style.height = "min(calc(100svh - 32px), 900px)";
  card.style.background = "#0c1220";
  card.style.border = "1px solid #233455";
  card.style.borderRadius = "14px";
  card.style.overflow = "hidden";
  card.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.6)";
  card.style.position = "relative";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.boxSizing = "border-box";

  const header = document.createElement("div");
  header.style.padding = "8px 12px";
  header.style.display = "flex";
  header.style.justifyContent = "flex-end";
  header.style.background = "#0a101a";
  header.style.borderBottom = "1px solid #1a2a44";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close \u00d7";
  closeBtn.style.border = "1px solid #30496f";
  closeBtn.style.background = "#12213a";
  closeBtn.style.color = "#dce7fb";
  closeBtn.style.padding = "6px 16px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "13px";
  closeBtn.style.fontWeight = "600";
  closeBtn.onclick = function closeSurvey() {
    removeSurveyOverlay();
    pushAction("survey_closed", {});
    captureAnalyticsEvent("survey_closed", { survey_id: surveyId });
  };

  const iframe = document.createElement("iframe");
  iframe.id = SURVEY_IFRAME_ID;
  iframe.src = `${surveyUrl}?${new URLSearchParams(params).toString()}`;
  iframe.title = params.survey_context ? "Landnám Survey" : "Landnám Exit Survey";
  iframe.style.width = "100%";
  iframe.style.flex = "1";
  iframe.style.border = "0";
  iframe.allow = "fullscreen";

  header.appendChild(closeBtn);
  card.appendChild(header);
  card.appendChild(iframe);
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
}

// ── Micro-survey helpers ──────────────────────────────────────────────────────

async function maybeTriggerMicroSurvey(storageKey, surveyId, context, eventPayload) {
  // Don't stack with another open overlay.
  if (document.getElementById(SURVEY_OVERLAY_ID)) return;
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
    await showInlineSurvey(params, surveyId);
    localStorage.setItem(storageKey, new Date().toISOString());
  } catch (err) {
    console.error("Micro-survey trigger failed:", storageKey, err);
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

function maybeShowUpgradeSurvey(payload) {
  maybeTriggerMicroSurvey(
    MICRO_SURVEY_KEYS.upgrade,
    MICRO_SURVEY_IDS.upgrade,
    "micro_room_upgrade_value",
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
      if (eventName === "franc_balance_updated" && String(payload.source || "").startsWith("room_upgrade")) {
        maybeShowUpgradeSurvey(payload);
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
        showFeedbackDialog(payload);
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
      if (eventName === "scanner_scan_completed") {
        maybeShowScienceSurvey(payload);
      }
      if (eventName === "mission_debrief_resolved") {
        maybeShowProgressionSurvey(payload);
        maybeShowM4CompleteSurvey(payload);
      }
      if (eventName === "rocket_launched") {
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
    if (localStorage.getItem("planet_hunters_install_banner_dismissed_v1")) return;
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
                  localStorage.setItem("planet_hunters_install_banner_dismissed_v1", "1");
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
