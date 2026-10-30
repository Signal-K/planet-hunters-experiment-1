const vscode = require('vscode')

let panel, output, statusItem
const base = () => `http://127.0.0.1:${vscode.workspace.getConfiguration('landnamPreview').get('port', 4320)}`

// This is a browser preview of an anonymous fixture, not a runtime manager.
// Keeping the URL fixed lets Next's normal hot reload do all scene updates.
const previewUrl = () => `http://localhost:${vscode.workspace.getConfiguration('landnamPreview').get('port', 4320)}/game/stage?preset=sandbox%3Acp-mid&follow=1&preview=1`

async function health() {
  try {
    const response = await fetch(`${base()}/api/dev/follow`, { signal: AbortSignal.timeout(1200), cache: 'no-store' })
    if (!response.ok) return { ok: false, detail: `web preview returned ${response.status}` }
    const { follower } = await response.json()
    const live = Date.now() - Number(follower?.seenAt ?? 0) < 7000
    return { ok: true, follower: live, detail: live ? `connected ${follower.viewport ?? ''}` : 'web server ready' }
  } catch { return { ok: false, detail: 'web server unavailable — run make ensure' } }
}

function setStatus(message, healthy = false) {
  statusItem.text = healthy ? '$(eye) Landnam Preview' : '$(warning) Landnam Preview'
  statusItem.tooltip = message
  statusItem.show()
  output.appendLine(`[preview] ${message}`)
  panel?.webview.postMessage({ type: 'status', message, healthy })
}

async function report() {
  const state = await health()
  setStatus(state.detail, state.ok && state.follower)
}

function html() {
  const nonce = String(Date.now())
  const url = previewUrl()
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src http://127.0.0.1:* http://localhost:*; script-src 'nonce-${nonce}'"><style>body{margin:0;background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family)}#status{padding:8px 12px;border-bottom:1px solid var(--vscode-panel-border);font-size:12px}iframe{width:100vw;height:calc(100vh - 36px);border:0}</style></head><body><div id="status">Loading web preview…</div><iframe id="preview" src="${url}"></iframe><script nonce="${nonce}">const status=document.getElementById('status');const frame=document.getElementById('preview');window.addEventListener('message',event=>{const message=event.data;if(message.type==='status'){status.textContent=message.message;status.style.color=message.healthy?'var(--vscode-testing-iconPassed)':'var(--vscode-testing-iconFailed)'}if(message.type==='reload')frame.src=message.url});</script></body></html>`
}

function open() {
  if (panel) { panel.reveal(vscode.ViewColumn.Beside); void report(); return }
  panel = vscode.window.createWebviewPanel('landnamPreview', 'Landnam Preview', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true })
  panel.webview.html = html()
  panel.onDidDispose(() => { panel = undefined })
  void report()
}

function refresh() {
  panel?.webview.postMessage({ type: 'reload', url: `${previewUrl()}&t=${Date.now()}` })
  void report()
}

function activate(context) {
  output = vscode.window.createOutputChannel('Landnam Preview')
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50)
  context.subscriptions.push(
    output,
    statusItem,
    vscode.commands.registerCommand('landnamPreview.open', open),
    vscode.commands.registerCommand('landnamPreview.restart', refresh),
    vscode.commands.registerCommand('landnamPreview.status', async () => vscode.window.showInformationMessage(`Landnam Preview: ${(await health()).detail}`)),
  )
  const timer = setInterval(() => void report(), 3000)
  context.subscriptions.push(new vscode.Disposable(() => clearInterval(timer)))
}

function deactivate() {}
module.exports = { activate, deactivate }
