'use client'

export default function OfflinePage() {
  return (
    <div className="offline-page">
      <div className="offline-panel">
        <span className="offline-icon" aria-hidden="true">◈</span>
        <h1>DATA LINK SEVERED</h1>
        <p>No connection to mission control. Your progress is saved on this device.</p>
        <button onClick={() => window.location.reload()} className="offline-retry">
          RETRY CONNECTION
        </button>
      </div>

      <style>{`
        .offline-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--ln-void, #070b12);
          padding: 24px;
          font-family: var(--ln-font-body, system-ui, sans-serif);
        }
        .offline-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          max-width: 320px;
          text-align: center;
        }
        .offline-icon {
          font-size: 48px;
          color: var(--ln-cyan, #00e5ff);
          opacity: 0.4;
        }
        h1 {
          font-family: var(--ln-font-display, 'Oxanium', sans-serif);
          font-size: 18px;
          letter-spacing: 0.12em;
          color: var(--ln-cyan, #00e5ff);
          margin: 0;
        }
        p {
          font-size: 14px;
          color: rgba(255,255,255,0.5);
          margin: 0;
          line-height: 1.5;
        }
        .offline-retry {
          margin-top: 8px;
          padding: 10px 24px;
          background: transparent;
          border: 1px solid rgba(0, 229, 255, 0.35);
          border-radius: 4px;
          color: var(--ln-cyan, #00e5ff);
          font-family: var(--ln-font-display, 'Oxanium', sans-serif);
          font-size: 13px;
          letter-spacing: 0.1em;
          cursor: pointer;
        }
        .offline-retry:hover {
          background: rgba(0, 229, 255, 0.08);
        }
      `}</style>
    </div>
  )
}
