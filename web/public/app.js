(function initWebShell() {
  var STORAGE_STATUS_ID = "storage-status";
  var SAVE_MARKER_ID = "save-marker";
  var SAVE_MARKER_KEY = "planet_hunters_web_shell_bootstrap_v1";

  function setText(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (ok) {
      el.classList.add("ok");
    }
  }

  function updateSaveMarker() {
    var marker = localStorage.getItem(SAVE_MARKER_KEY);
    if (!marker) {
      marker = new Date().toISOString();
      localStorage.setItem(SAVE_MARKER_KEY, marker);
    }
    setText(SAVE_MARKER_ID, "Progress marker: " + marker, true);
  }

  async function requestPersistentStorage() {
    if (!navigator.storage || !navigator.storage.persist) {
      setText(STORAGE_STATUS_ID, "Storage: API unavailable", false);
      return;
    }
    try {
      var alreadyPersisted = await navigator.storage.persisted();
      if (alreadyPersisted) {
        setText(STORAGE_STATUS_ID, "Storage: persistent", true);
        return;
      }
      var granted = await navigator.storage.persist();
      setText(STORAGE_STATUS_ID, granted ? "Storage: persistent" : "Storage: best effort", granted);
    } catch (error) {
      setText(STORAGE_STATUS_ID, "Storage: check failed", false);
      // eslint-disable-next-line no-console
      console.error("Storage persistence check failed:", error);
    }
  }

  updateSaveMarker();
  requestPersistentStorage();
})();
