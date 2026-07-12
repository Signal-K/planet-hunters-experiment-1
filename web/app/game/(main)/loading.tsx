export default function GameScreenLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ln-void)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--ln-font-mono)',
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ln-cyan)',
          opacity: 0.6,
        }}
      >
        Loading…
      </div>
    </div>
  )
}
