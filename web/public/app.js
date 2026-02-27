/* eslint-env browser */
(function initWebShell() {
  var STORAGE_STATUS_ID = "storage-status";
  var SAVE_MARKER_ID = "save-marker";
  var SAVE_MARKER_KEY = "planet_hunters_web_shell_bootstrap_v1";
  var ACTION_LOG_KEY = "planet_hunters_action_log_v1";
  var SURVEY_SHOWN_KEY = "planet_hunters_exit_survey_first_mission_v1";
  var SURVEY_OVERLAY_ID = "planet-hunters-survey-overlay";
  var SURVEY_IFRAME_ID = "planet-hunters-survey-iframe";
  var FEEDBACK_OVERLAY_ID = "planet-hunters-feedback-overlay";
  var SUPABASE_SESSION_STORAGE_KEY = "planet_hunters_supabase_guest";
  var DEFAULT_RUNTIME_CONFIG = {
    posthog: {
      projectToken: "phc_65umDftbbTkrm1V6azue6OeU4u5c8iJcaHm4JtJ95di",
      apiHost: "https://us.i.posthog.com",
      uiHost: "https://us.posthog.com",
      surveyId: "019c603e-d236-0000-85ce-f507635d2311",
    },
    supabase: {
      url: "https://hlufptwhzkpkkjztimzo.supabase.co",
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWZwdHdoemtwa2tqenRpbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyOTk3NTUsImV4cCI6MjAzMTg3NTc1NX0.v_NDVWjIU_lJQSPbJ_Y6GkW3axrQWKXfXVsBEAbFv_I",
    },
  };

  var _actionLog = [];
  var _supabaseClientPromise = null;
  var _surveyShownInThisBoot = false;
  var _posthogPromise = null;
  var _runtimeConfig = null;
  var _runtimeConfigPromise = null;

  function setText(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (ok) {
      el.classList.add("ok");
    }
  }

  function safeJsonParse(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function mergeRuntimeConfig(remoteConfig) {
    var fallback = DEFAULT_RUNTIME_CONFIG;
    var remotePosthog = (remoteConfig && remoteConfig.posthog) || {};
    var remoteSupabase = (remoteConfig && remoteConfig.supabase) || {};
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
      .then(async function (response) {
        if (!response.ok) {
          throw new Error("Runtime config request failed: " + response.status);
        }
        return response.json();
      })
      .then(function (payload) {
        _runtimeConfig = mergeRuntimeConfig(payload);
        return _runtimeConfig;
      })
      .catch(function (error) {
        console.warn("Falling back to default runtime config:", error);
        _runtimeConfig = mergeRuntimeConfig(null);
        return _runtimeConfig;
      })
      .finally(function () {
        _runtimeConfigPromise = null;
      });
    return _runtimeConfigPromise;
  }

  function loadActionLog() {
    var parsed = safeJsonParse(localStorage.getItem(ACTION_LOG_KEY), []);
    if (Array.isArray(parsed)) {
      _actionLog = parsed.slice(-200);
    } else {
      _actionLog = [];
    }
  }

  function saveActionLog() {
    try {
      localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(_actionLog.slice(-200)));
    } catch (error) {
      console.warn("Failed to persist action log:", error);
    }
  }

  function pushAction(eventName, payload) {
    var entry = {
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
      .then(function (result) {
        var runtimeConfig = result[0];
        var mod = result[1];
        var posthogConfig = runtimeConfig.posthog || DEFAULT_RUNTIME_CONFIG.posthog;
        if (!posthogConfig.projectToken) {
          throw new Error("PostHog project token missing");
        }
        var client = mod.default || mod.posthog || mod;
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
          loaded: function (ph) {
            ph.register({
              app: "planet_hunters_experiment1_web",
              runtime: "godot_web_shell",
            });
          },
        });
        return client;
      })
      .catch(function (error) {
        _posthogPromise = null;
        throw error;
      });
    return _posthogPromise;
  }

  function registerAnalyticsContext(properties) {
    loadPostHogClient()
      .then(function (client) {
        client.register(properties);
      })
      .catch(function (error) {
        console.warn("PostHog register failed:", error);
      });
  }

  function captureAnalyticsEvent(eventName, payload) {
    loadPostHogClient()
      .then(function (client) {
        var eventPayload = payload && typeof payload === "object" ? payload : {};
        client.capture(eventName, eventPayload);
        client.register({
          last_game_event: eventName,
          mission_stage: eventPayload.mission_stage,
          experience_level: eventPayload.experience_level,
          selected_target_id: eventPayload.selected_target_id || eventPayload.target_id || "",
          selected_target_type: eventPayload.target_type || eventPayload.preview_target_type || "",
        });
      })
      .catch(function (error) {
        console.warn("PostHog capture failed for " + eventName + ":", error);
      });
  }

  async function syncAnalyticsIdentity(distinctId) {
    if (!distinctId) {
      return;
    }
    try {
      var client = await loadPostHogClient();
      client.identify(distinctId, {
        source: "planet_hunters_experiment1_web",
      });
    } catch (error) {
      console.warn("PostHog identify failed:", error);
    }
  }

  function updateSaveMarker() {
    var marker = localStorage.getItem(SAVE_MARKER_KEY);
    if (!marker) {
      marker = new Date().toISOString();
      localStorage.setItem(SAVE_MARKER_KEY, marker);
    }
    setText(SAVE_MARKER_ID, "Progress marker: " + marker, true);
    pushAction("save_marker_ready", { marker: marker });
  }

  async function requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
      setText(STORAGE_STATUS_ID, "Storage: API unavailable", false);
      pushAction("storage_status", { status: "api_unavailable" });
      return;
    }
    try {
      var alreadyPersisted = await navigator.storage.persisted();
      if (alreadyPersisted) {
        setText(STORAGE_STATUS_ID, "Storage: persistent", true);
        pushAction("storage_status", { status: "persistent" });
        return;
      }
      var granted = await navigator.storage.persist();
      setText(STORAGE_STATUS_ID, granted ? "Storage: persistent" : "Storage: best effort", granted);
      pushAction("storage_status", { status: granted ? "persistent" : "best_effort" });
    } catch (error) {
      setText(STORAGE_STATUS_ID, "Storage: check failed", false);
      pushAction("storage_status", { status: "check_failed", error: String(error && error.message ? error.message : error) });
      console.error("Storage persistence check failed:", error);
    }
  }

  async function loadSupabaseClient() {
    if (_supabaseClientPromise) {
      return _supabaseClientPromise;
    }
    _supabaseClientPromise = Promise.all([getRuntimeConfig(), import("https://esm.sh/@supabase/supabase-js@2?bundle")])
      .then(function (result) {
        var runtimeConfig = result[0];
        var mod = result[1];
        var createClient = mod.createClient || (mod.default && mod.default.createClient);
        if (!createClient) {
          throw new Error("Supabase createClient not available");
        }
        var supabaseConfig = runtimeConfig.supabase || DEFAULT_RUNTIME_CONFIG.supabase;
        return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: SUPABASE_SESSION_STORAGE_KEY,
          },
        });
      });
    return _supabaseClientPromise;
  }

  async function ensureGuestUser() {
    var client = await loadSupabaseClient();
    var current = await client.auth.getUser();
    if (current && current.data && current.data.user && current.data.user.id) {
      return current.data.user.id;
    }
    var created = await client.auth.signInAnonymously({
      options: {
        data: {
          source: "planet_hunters_experiment1_web",
          created_by: "inline_survey_trigger",
        },
      },
    });
    if (created && created.error) {
      throw created.error;
    }
    var user = created && created.data && created.data.user;
    if (!user || !user.id) {
      throw new Error("Anonymous sign-in succeeded but no user id was returned");
    }
    return user.id;
  }

  function localDistinctId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return "local_guest_" + crypto.randomUUID();
    }
    return "local_guest_" + Date.now() + "_" + Math.floor(Math.random() * 1e9);
  }

  async function resolveSurveyDistinctId() {
    try {
      var distinctId = await ensureGuestUser();
      syncAnalyticsIdentity(distinctId);
      return distinctId;
    } catch (error) {
      console.warn("Falling back to local distinct id for survey:", error);
      var fallback = localDistinctId();
      syncAnalyticsIdentity(fallback);
      return fallback;
    }
  }

  function buildProgressJson(finalEventPayload) {
    var compactActions = _actionLog.slice(-120).map(function (item) {
      return {
        t: item.t,
        e: item.e,
        p: item.p || {},
      };
    });
    var summary = {
      version: 1,
      survey_trigger: "first_mission_completed",
      final_event: finalEventPayload || {},
      actions: compactActions,
    };

    var json = JSON.stringify(summary);
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
    var existing = document.getElementById(SURVEY_OVERLAY_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  function removeFeedbackOverlay() {
    var existing = document.getElementById(FEEDBACK_OVERLAY_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }

  function showFeedbackDialog(context) {
    var dialogContext = context && typeof context === "object" ? context : {};
    removeFeedbackOverlay();

    var overlay = document.createElement("div");
    overlay.id = FEEDBACK_OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(2, 6, 15, 0.78)";
    overlay.style.zIndex = "2147482647";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";

    var card = document.createElement("form");
    card.style.width = "min(560px, 100%)";
    card.style.background = "#08111d";
    card.style.border = "1px solid #233455";
    card.style.borderRadius = "18px";
    card.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.45)";
    card.style.padding = "22px";
    card.style.display = "grid";
    card.style.gap = "12px";

    var title = document.createElement("h2");
    title.textContent = "Where did you get stuck?";
    title.style.margin = "0";
    title.style.fontSize = "24px";
    title.style.color = "#e7edf9";

    var intro = document.createElement("p");
    intro.textContent = "Send quick feedback with your current context. We will line it up with replay and gameplay events.";
    intro.style.margin = "0";
    intro.style.color = "#a9b4cc";
    intro.style.lineHeight = "1.5";

    var blockerSelect = document.createElement("select");
    blockerSelect.innerHTML = [
      '<option value="navigation">I could not tell where to go</option>',
      '<option value="mining">Mining felt too hard or unclear</option>',
      '<option value="targeting">I did not understand target choice</option>',
      '<option value="economy">Rewards or progression felt confusing</option>',
      '<option value="bug">Something looked broken</option>',
    ].join("");

    var severitySelect = document.createElement("select");
    severitySelect.innerHTML = [
      '<option value="minor">Minor friction</option>',
      '<option value="major">Major blocker</option>',
      '<option value="quit_risk">I was close to quitting</option>',
    ].join("");

    var expectation = document.createElement("textarea");
    expectation.rows = 5;
    expectation.placeholder = "What were you trying to do, and what did you expect to happen?";
    expectation.style.resize = "vertical";

    var details = document.createElement("textarea");
    details.rows = 4;
    details.placeholder = "Anything else? Controls, tutorial, pacing, unclear text, bugs.";
    details.style.resize = "vertical";

    [blockerSelect, severitySelect, expectation, details].forEach(function (element) {
      element.style.width = "100%";
      element.style.boxSizing = "border-box";
      element.style.borderRadius = "12px";
      element.style.border = "1px solid #30496f";
      element.style.background = "#101c30";
      element.style.color = "#e7edf9";
      element.style.padding = "12px";
      element.style.font = "inherit";
    });

    var footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";
    footer.style.gap = "12px";
    footer.style.flexWrap = "wrap";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.border = "1px solid #30496f";
    closeBtn.style.background = "#12213a";
    closeBtn.style.color = "#dce7fb";
    closeBtn.style.padding = "10px 14px";
    closeBtn.style.borderRadius = "999px";
    closeBtn.onclick = function () {
      removeFeedbackOverlay();
      pushAction("feedback_dialog_closed", dialogContext);
      captureAnalyticsEvent("feedback_dialog_closed", dialogContext);
    };

    var submitBtn = document.createElement("button");
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

    card.onsubmit = async function (event) {
      event.preventDefault();
      var distinctId = await resolveSurveyDistinctId();
      var payload = {
        distinct_id: distinctId,
        blocker_type: blockerSelect.value,
        blocker_severity: severitySelect.value,
        expectation_text: expectation.value.trim(),
        detail_text: details.value.trim(),
        recent_actions_json: buildProgressJson({ feedback_context: dialogContext }),
      };
      var key;
      for (key in dialogContext) {
        if (Object.prototype.hasOwnProperty.call(dialogContext, key)) {
          payload[key] = dialogContext[key];
        }
      }
      pushAction("player_feedback_submitted", payload);
      captureAnalyticsEvent("player_feedback_submitted", payload);
      removeFeedbackOverlay();
    };

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    pushAction("feedback_dialog_opened", dialogContext);
    captureAnalyticsEvent("feedback_dialog_opened", dialogContext);
  }

  async function showInlineSurvey(params) {
    var runtimeConfig = await getRuntimeConfig();
    var surveyId = runtimeConfig.posthog.surveyId;
    var surveyUrl = runtimeConfig.posthog.uiHost + "/external_surveys/" + surveyId;
    removeSurveyOverlay();

    var overlay = document.createElement("div");
    overlay.id = SURVEY_OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(2, 6, 15, 0.78)";
    overlay.style.zIndex = "2147482646";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "20px";

    var card = document.createElement("div");
    card.style.width = "min(860px, 100%)";
    card.style.height = "min(88vh, 900px)";
    card.style.background = "#0c1220";
    card.style.border = "1px solid #233455";
    card.style.borderRadius = "14px";
    card.style.overflow = "hidden";
    card.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.45)";
    card.style.position = "relative";

    var closeBtn = document.createElement("button");
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
    closeBtn.onclick = function () {
      removeSurveyOverlay();
      pushAction("survey_closed", {});
      captureAnalyticsEvent("survey_closed", { survey_id: surveyId });
    };

    var iframe = document.createElement("iframe");
    iframe.id = SURVEY_IFRAME_ID;
    iframe.src = surveyUrl + "?" + new URLSearchParams(params).toString();
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
    if (_surveyShownInThisBoot) {
      return;
    }
    if (localStorage.getItem(SURVEY_SHOWN_KEY)) {
      return;
    }

    var missionCount = Number((eventPayload && eventPayload.mission_count) || 0);
    if (missionCount > 1) {
      return;
    }

    try {
      var guestId = await resolveSurveyDistinctId();
      var progressJson = buildProgressJson(eventPayload);
      var params = {
        distinct_id: guestId,
        supabase_guest_id: guestId,
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

  function onBridgeMessage(event) {
    if (!event || event.origin !== window.location.origin) {
      return;
    }
    var data = event.data;
    if (!data || typeof data !== "object" || data.source !== "planet-hunters") {
      return;
    }
    var eventName = String(data.event || "");
    var payload = data.payload && typeof data.payload === "object" ? data.payload : {};
    if (!eventName) {
      return;
    }
    pushAction(eventName, payload);
    captureAnalyticsEvent(eventName, payload);
    if (eventName === "feedback_requested") {
      showFeedbackDialog(payload);
    }
    if (eventName === "first_mission_completed") {
      maybeTriggerFirstMissionSurvey(payload);
    }
  }

  loadActionLog();
  pushAction("web_shell_loaded", { href: window.location.href });
  captureAnalyticsEvent("web_shell_loaded", { href: window.location.href });
  resolveSurveyDistinctId().then(function (distinctId) {
    registerAnalyticsContext({
      distinct_id_hint: distinctId,
      shell_entry: "inline_web_shell",
    });
  });
  window.addEventListener("message", onBridgeMessage);
  updateSaveMarker();
  requestPersistentStorage();
})();
