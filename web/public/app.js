/* eslint-env browser */
(function initWebShell() {
  var STORAGE_STATUS_ID = "storage-status";
  var SAVE_MARKER_ID = "save-marker";
  var SAVE_MARKER_KEY = "planet_hunters_web_shell_bootstrap_v1";
  var ACTION_LOG_KEY = "planet_hunters_action_log_v1";
  var SURVEY_SHOWN_KEY = "planet_hunters_exit_survey_first_mission_v1";
  var SURVEY_OVERLAY_ID = "planet-hunters-survey-overlay";
  var SURVEY_IFRAME_ID = "planet-hunters-survey-iframe";
  var SUPABASE_SESSION_STORAGE_KEY = "planet_hunters_supabase_guest";

  var SURVEY_ID = "019c603e-d236-0000-85ce-f507635d2311";
  var SURVEY_URL = "https://us.posthog.com/external_surveys/" + SURVEY_ID;

  var SUPABASE_URL = "https://hlufptwhzkpkkjztimzo.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWZwdHdoemtwa2tqenRpbXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYyOTk3NTUsImV4cCI6MjAzMTg3NTc1NX0.v_NDVWjIU_lJQSPbJ_Y6GkW3axrQWKXfXVsBEAbFv_I";

  var _actionLog = [];
  var _supabaseClientPromise = null;
  var _surveyShownInThisBoot = false;

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
    _supabaseClientPromise = import("https://esm.sh/@supabase/supabase-js@2?bundle")
      .then(function (mod) {
        var createClient = mod.createClient || (mod.default && mod.default.createClient);
        if (!createClient) {
          throw new Error("Supabase createClient not available");
        }
        return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  function showInlineSurvey(params) {
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
    };

    var iframe = document.createElement("iframe");
    iframe.id = SURVEY_IFRAME_ID;
    iframe.src = SURVEY_URL + "?" + new URLSearchParams(params).toString();
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
      survey_id: SURVEY_ID,
      mission_count: params.mission_count || "",
      supabase_guest_id: params.supabase_guest_id || "",
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
      var guestId = await ensureGuestUser();
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
      showInlineSurvey(params);
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
    if (eventName === "first_mission_completed") {
      maybeTriggerFirstMissionSurvey(payload);
    }
  }

  loadActionLog();
  pushAction("web_shell_loaded", { href: window.location.href });
  window.addEventListener("message", onBridgeMessage);
  updateSaveMarker();
  requestPersistentStorage();
})();
