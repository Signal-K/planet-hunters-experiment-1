const vscode = require('vscode')
const { spawn } = require('node:child_process')

let panel, starter, output, statusItem
const root = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
const base = () => `http://127.0.0.1:${vscode.workspace.getConfiguration('landnamPreview').get('port', 4320)}`
// The panel is a disposable fixture, never the live game route. This makes
// rendered checks independent of a signed-in account or saved player state.
const previewUrl = () => `http://localhost:${vscode.workspace.getConfiguration('landnamPreview').get('port', 4320)}/game/stage?preset=sandbox%3Asandbox-hub&follow=1`

async function health() {
  try {
    const response = await fetch(`${base()}/api/dev/follow`, { signal: AbortSignal.timeout(1200), cache: 'no-store' })
    if (!response.ok) return { ok: false, detail: `preview returned ${response.status}` }
    const { follower } = await response.json()
    const live = Date.now() - Number(follower?.seenAt ?? 0) < 7000
    return { ok: true, follower: live, detail: live ? `connected ${follower.viewport ?? ''}` : 'server ready; preview panel reconnecting' }
  } catch { return { ok: false, detail: 'server unavailable' } }
}

function setStatus(message, healthy = false) {
  statusItem.text = healthy ? '$(eye) Landnam Preview' : '$(warning) Landnam Preview'
  statusItem.tooltip = message; statusItem.show(); output.appendLine(`[preview] ${message}`)
  panel?.webview.postMessage({ type: 'status', message, healthy })
}

async function ensure() {
  const cwd = root()
  if (!cwd) throw new Error('Open the Landnam workspace before starting its preview.')
  if ((await health()).ok) return
  if (starter) return
  const command = vscode.workspace.getConfiguration('landnamPreview').get('startCommand', 'make ensure')
  setStatus(`starting: ${command}`)
  starter = spawn(command, { cwd, shell: true })
  starter.stdout.on('data', chunk => output.append(chunk.toString()))
  starter.stderr.on('data', chunk => output.append(chunk.toString()))
  starter.on('exit', code => { output.appendLine(`[preview] starter exited (${code ?? 'signal'})`); starter = undefined })
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    if ((await health()).ok) return
  }
  throw new Error('Landnam preview did not become healthy. Open the Landnam Preview output for the starter log.')
}

function html() {
  const nonce = String(Date.now())
  // Cursor's webview resolves the browser-facing `localhost` correctly, while
  // the extension host uses the explicit IPv4 address for its health probe.
  const initial = previewUrl()
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; frame-src http://127.0.0.1:* http://localhost:*; script-src 'nonce-${nonce}'"><style>body{margin:0;background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family)}#status{padding:8px 12px;border-bottom:1px solid var(--vscode-panel-border);font-size:12px}iframe{width:100vw;height:calc(100vh - 36px);border:0}</style></head><body><div id="status">Connecting to Landnam Preview…</div><iframe id="preview" src="${initial}"></iframe><script nonce="${nonce}">const vscode=acquireVsCodeApi();const status=document.getElementById('status');const frame=document.getElementById('preview');window.addEventListener('message',event=>{const message=event.data;if(message.type==='status'){status.textContent=message.message;status.style.color=message.healthy?'var(--vscode-testing-iconPassed)':'var(--vscode-testing-iconFailed)'}if(message.type==='reload'){frame.src=message.url}});frame.addEventListener('load',()=>vscode.postMessage({type:'loaded'}));</script></body></html>`
}

async function report() { const state = await health(); setStatus(state.detail, state.ok && state.follower) }
async function open() {
  await ensure()
  if (panel) { panel.reveal(vscode.ViewColumn.Beside); await report(); return }
  panel = vscode.window.createWebviewPanel('landnamPreview', 'Landnam Preview', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true })
  panel.webview.html = html(); panel.onDidDispose(() => { panel = undefined })
  panel.webview.onDidReceiveMessage(message => { if (message.type === 'loaded') void report() })
  await report()
}
async function restart() { starter?.kill(); starter = undefined; await ensure(); panel?.webview.postMessage({ type: 'reload', url: `${previewUrl()}&t=${Date.now()}` }); await report() }
function activate(context) {
  output = vscode.window.createOutputChannel('Landnam Preview'); statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50)
  context.subscriptions.push(output, statusItem,
    vscode.commands.registerCommand('landnamPreview.open', open),
    vscode.commands.registerCommand('landnamPreview.restart', restart),
    vscode.commands.registerCommand('landnamPreview.status', async () => vscode.window.showInformationMessage(`Landnam Preview: ${(await health()).detail}`)),
    new vscode.Disposable(() => starter?.kill()))
  const timer = setInterval(() => void report(), 3000); context.subscriptions.push(new vscode.Disposable(() => clearInterval(timer)))
}
function deactivate() { starter?.kill() }
module.exports = { activate, deactivate }
