// Landnam TOML: outline of the open scene file, folding of its big tables, compile status in the status bar.
// Plain JS, no build step. Reads only the open document and web/.dev-scene-change.json.
const vscode = require('vscode')
const fs = require('fs')
const path = require('path')

const isScene = d => d && /shared[\\/]authoring[\\/](scenes|fixtures|missions|flows)[\\/][^\\/]+\.toml$/.test(d.fileName)
const HEADER = /^\s*\[\[?\s*([A-Za-z0-9_.-]+)\s*\]\]?\s*(#.*)?$/
const BIG = new Set(['things', 'states', 'presets', 'parts', 'checkpoints', 'dials'])
const KEYED = new Set(['parts', 'checkpoints', 'dials'])

/** Every [table] / [[table]] with its line and a readable name from id / label inside it. */
function parse(doc) {
  const out = []
  for (let i = 0; i < doc.lineCount; i++) {
    const m = HEADER.exec(doc.lineAt(i).text)
    if (!m) continue
    if (out.length) out[out.length - 1].end = i - 1
    out.push({ table: m[1], line: i, end: doc.lineCount - 1, id: null, label: null })
  }
  // One-line entries (`launchpad = { label = ... }`) under [parts] / [checkpoints] / [dials] are outline items too.
  const keyed = []
  for (const t of out) {
    if (!KEYED.has(t.table)) continue
    for (let i = t.line + 1; i <= t.end; i++) {
      const m = /^([A-Za-z0-9_-]+)\s*=\s*\{(.*)\}\s*$/.exec(doc.lineAt(i).text)
      if (m) { const lb = /label\s*=\s*"([^"]*)"/.exec(m[2]); keyed.push({ table: t.table, line: i, end: i, id: m[1], label: lb && lb[1] }) }
    }
  }
  out.push(...keyed)
  for (const t of out) {
    if (KEYED.has(t.table) && t.id) continue
    for (let i = t.line + 1; i <= t.end && i < t.line + 8; i++) {
      const s = doc.lineAt(i).text
      const id = /^\s*id\s*=\s*"([^"]*)"/.exec(s); if (id && !t.id) t.id = id[1]
      const lb = /^\s*(label|title|name)\s*=\s*"([^"]*)"/.exec(s); if (lb && !t.label) t.label = lb[2]
    }
  }
  return out
}

class Outline {
  constructor() { this._e = new vscode.EventEmitter(); this.onDidChangeTreeData = this._e.event }
  refresh() { this._e.fire() }
  getTreeItem(n) { return n.item }
  getChildren(n) {
    const doc = vscode.window.activeTextEditor && vscode.window.activeTextEditor.document
    if (!isScene(doc)) return []
    if (n) return n.children || []
    const groups = new Map()
    for (const t of parse(doc)) {
      if (!groups.has(t.table)) groups.set(t.table, [])
      groups.get(t.table).push(t)
    }
    return [...groups].map(([table, items]) => {
      const item = new vscode.TreeItem(`${table}  (${items.length})`, items.length > 1 && BIG.has(table) ? 1 : items.length > 1 ? 1 : 0)
      item.iconPath = new vscode.ThemeIcon(table === 'things' ? 'symbol-misc' : table === 'objects' ? 'symbol-object' : 'symbol-namespace')
      item.command = { command: 'landnam.reveal', title: 'Go', arguments: [items[0].line] }
      return { item, children: items.map(t => {
        const c = new vscode.TreeItem(t.label || t.id || `${table} @ ${t.line + 1}`, 0)
        c.description = t.label && t.id ? t.id : `line ${t.line + 1}`
        c.command = { command: 'landnam.reveal', title: 'Go', arguments: [t.line] }
        return { item: c }
      }) }
    })
  }
}

exports.activate = function (ctx) {
  const outline = new Outline()
  const refresh = () => outline.refresh()
  ctx.subscriptions.push(
    vscode.window.registerTreeDataProvider('landnamOutline', outline),
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument(e => { if (isScene(e.document)) refresh() }),
    vscode.commands.registerCommand('landnam.reveal', line => {
      const ed = vscode.window.activeTextEditor; if (!ed) return
      const p = new vscode.Position(line, 0)
      ed.selection = new vscode.Selection(p, p)
      ed.revealRange(new vscode.Range(p, p), vscode.TextEditorRevealType.AtTop)
    }),
    vscode.commands.registerCommand('landnam.foldBig', async () => {
      const ed = vscode.window.activeTextEditor; if (!isScene(ed && ed.document)) return
      const lines = parse(ed.document).filter(t => BIG.has(t.table)).map(t => t.line)
      await vscode.commands.executeCommand('editor.fold', { selectionLines: lines, levels: 1 })
    }),
    vscode.commands.registerCommand('landnam.openPreset', async () => {
      const ed = vscode.window.activeTextEditor; if (!isScene(ed && ed.document)) return
      const id = path.basename(ed.document.fileName, '.toml')
      const file = path.join(path.dirname(ed.document.fileName), '..', 'fixtures', `${id}.toml`)
      const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ed.document.getText()
      const presets = [...text.matchAll(/^\[\[presets\]\]\s*\nid\s*=\s*"([^"]+)"(?:\s*\nname\s*=\s*"([^"]*)")?/gm)].map(m => ({ label: m[2] || m[1], description: m[1] }))
      const pick = await vscode.window.showQuickPick(presets, { placeHolder: `Open which setup of ${id}?` })
      if (!pick) return
      const term = vscode.window.createTerminal('landnam scene')
      term.sendText(`node scripts/scene.mjs ${id} --preset ${pick.description}`, true)
    }),
    vscode.commands.registerCommand('landnam.openPreview', () => {
      const ed = vscode.window.activeTextEditor; if (!isScene(ed && ed.document)) return
      const id = path.basename(ed.document.fileName, '.toml')
      const term = vscode.window.createTerminal('landnam scene')
      term.sendText(`node scripts/scene.mjs ${id}`, true)
    }),
    // Tables fold from header to the next header, so a 43-thing file collapses to 43 lines.
    vscode.languages.registerFoldingRangeProvider({ pattern: '**/shared/authoring/**/*.toml' }, {
      provideFoldingRanges(doc) {
        return parse(doc).filter(t => t.end > t.line).map(t => new vscode.FoldingRange(t.line, t.end, vscode.FoldingRangeKind.Region))
      },
    }),
  )

  // Status bar: result of the last compile from scripts/scene-live.mjs.
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
  ctx.subscriptions.push(bar)
  const root = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath
  const marker = root && [path.join(root, 'web/.dev-scene-change.json'), path.join(root, 'Landnam/web/.dev-scene-change.json')].find(fs.existsSync)
  const tick = () => {
    try {
      const m = JSON.parse(fs.readFileSync(marker, 'utf8'))
      const at = new Date(m.ts).toLocaleTimeString('en-GB')
      bar.text = m.state === 'ok' ? `$(check) ${m.file} compiled ${at}` : `$(error) ${m.file}: ${m.detail}`
      bar.show()
    } catch { bar.hide() }
  }
  if (marker) { tick(); const iv = setInterval(tick, 1000); ctx.subscriptions.push({ dispose: () => clearInterval(iv) }) }
}
