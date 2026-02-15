import React, { useEffect, useMemo, useState } from "https://esm.sh/react@19";
import { createRoot } from "https://esm.sh/react-dom@19/client";

const COOKIE_NAME = "planet_hunters_progress_v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

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

function App() {
  const [progress, setProgress] = useState(() => parseProgress(readCookie(COOKIE_NAME)));
  const [storageStatus, setStorageStatus] = useState("Cookie storage active");
  const [gameSrc, setGameSrc] = useState("/electron-dist/godot-web/index.html");

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
      if (!data || data.type !== "PH_SAVE_PROGRESS") {
        return;
      }
      const next = {
        marker: String(data.marker || "game-update"),
        updatedAt: new Date().toISOString(),
      };
      saveProgress(next, setProgress);
    }

    window.addEventListener("message", onGameMessage);
    return () => window.removeEventListener("message", onGameMessage);
  }, []);

  const markerText = useMemo(() => {
    if (!progress) {
      return "pending";
    }
    return `${progress.marker} @ ${progress.updatedAt}`;
  }, [progress]);

  const frameStyle = {
    width: "100%",
    height: "min(75vh, 860px)",
    border: "0",
    display: "block",
    background: "#000",
  };

  return React.createElement(
    "main",
    { style: { maxWidth: "1200px", margin: "0 auto", padding: "20px" } },
    React.createElement(
      "h1",
      { style: { margin: "0 0 8px", fontSize: "clamp(24px, 4vw, 38px)", letterSpacing: "0.02em" } },
      "Planet Hunters Web"
    ),
    React.createElement(
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
    )
  );
}

createRoot(document.getElementById("root")).render(React.createElement(App));
