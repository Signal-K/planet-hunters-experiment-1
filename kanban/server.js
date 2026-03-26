/**
 * Planet Hunters Kanban Server
 *
 * Reads and writes tasks from the .knowns/tasks/ directory.
 * Each task is a markdown file with YAML frontmatter.
 *
 * Environment variables:
 *   KNOWNS_DIR  - path to the .knowns directory (default: ../.knowns)
 *   PORT        - server port (default: 4444)
 */

const express = require("express");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const PORT = process.env.PORT || 4444;
const KNOWNS_DIR = process.env.KNOWNS_DIR || path.resolve(__dirname, "../.knowns");
const TASKS_DIR = path.join(KNOWNS_DIR, "tasks");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Markdown frontmatter parse / serialise ────────────────────────────────────

function parseMd(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: content };
  try {
    return { frontmatter: yaml.load(m[1]) || {}, body: m[2] };
  } catch {
    return { frontmatter: {}, body: content };
  }
}

function serialiseMd(frontmatter, body) {
  return `---\n${yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd()}\n---\n${body}`;
}

function extractSection(body, name) {
  const re = new RegExp(`<!-- SECTION:${name}:BEGIN -->([\\s\\S]*?)<!-- SECTION:${name}:END -->`, "i");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function replaceSection(body, name, content) {
  const re = new RegExp(`(<!-- SECTION:${name}:BEGIN -->)[\\s\\S]*?(<!-- SECTION:${name}:END -->)`, "i");
  if (re.test(body)) {
    return body.replace(re, `$1\n${content}\n$2`);
  }
  return body + `\n<!-- SECTION:${name}:BEGIN -->\n${content}\n<!-- SECTION:${name}:END -->\n`;
}

function extractAcList(body) {
  const m = body.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/i);
  if (!m) return [];
  return m[1]
    .split("\n")
    .filter((l) => l.trim().match(/^- \[[ xX]\]/))
    .map((l, i) => ({
      index: i + 1,
      done: /^- \[[xX]\]/.test(l.trim()),
      text: l.replace(/^- \[[ xX]\]\s*/, "").replace(/^#\d+\s*/, "").trim(),
    }));
}

// ── Task file helpers ─────────────────────────────────────────────────────────

function listTaskFiles() {
  try {
    return fs.readdirSync(TASKS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

function findTaskFile(id) {
  const files = listTaskFiles();
  return files.find((f) => f.startsWith(`task-${id}`));
}

function readTask(filename) {
  const raw = fs.readFileSync(path.join(TASKS_DIR, filename), "utf8");
  const { frontmatter, body } = parseMd(raw);
  return {
    id: frontmatter.id || filename.replace(/^task-/, "").replace(/\.md$/, "").replace(/\s.*$/, ""),
    title: frontmatter.title || "",
    status: frontmatter.status || "todo",
    priority: frontmatter.priority || "medium",
    labels: frontmatter.labels || [],
    assignee: frontmatter.assignee || null,
    parent: frontmatter.parent || null,
    createdAt: frontmatter.createdAt || null,
    updatedAt: frontmatter.updatedAt || null,
    timeSpent: frontmatter.timeSpent || 0,
    description: extractSection(body, "DESCRIPTION"),
    ac: extractAcList(body),
    plan: extractSection(body, "PLAN"),
    notes: extractSection(body, "NOTES"),
    _filename: filename,
  };
}

// ── API routes ────────────────────────────────────────────────────────────────

app.get("/api/tasks", (_req, res) => {
  const tasks = listTaskFiles()
    .map((f) => {
      try {
        return readTask(f);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  res.json(tasks);
});

app.get("/api/tasks/:id", (req, res) => {
  const file = findTaskFile(req.params.id);
  if (!file) return res.status(404).json({ error: "Not found" });
  try {
    res.json(readTask(file));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  const file = findTaskFile(req.params.id);
  if (!file) return res.status(404).json({ error: "Not found" });

  const filePath = path.join(TASKS_DIR, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body: origBody } = parseMd(raw);

  const update = req.body;

  // Update frontmatter fields
  const updatable = ["title", "status", "priority", "labels", "assignee"];
  for (const key of updatable) {
    if (update[key] !== undefined) frontmatter[key] = update[key];
  }
  frontmatter.updatedAt = new Date().toISOString();

  // Update body sections
  let body = origBody;
  if (update.description !== undefined) {
    body = replaceSection(body, "DESCRIPTION", update.description);
  }
  if (update.notes !== undefined) {
    body = replaceSection(body, "NOTES", update.notes);
  }
  if (update.plan !== undefined) {
    body = replaceSection(body, "PLAN", update.plan);
  }

  fs.writeFileSync(filePath, serialiseMd(frontmatter, body), "utf8");
  res.json({ ok: true });
});

app.post("/api/tasks", (req, res) => {
  const { title, status = "todo", priority = "medium", labels = [], assignee = null, description = "" } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });

  // Generate a 6-char random ID
  const id = Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const filename = `task-${id} - ${slug}.md`;

  const frontmatter = { id, title, status, priority, labels, assignee, createdAt: now, updatedAt: now, timeSpent: 0 };
  const body = `# ${title}\n\n## Description\n\n<!-- SECTION:DESCRIPTION:BEGIN -->\n${description}\n<!-- SECTION:DESCRIPTION:END -->\n\n## Acceptance Criteria\n<!-- AC:BEGIN -->\n<!-- AC:END -->\n`;

  fs.writeFileSync(path.join(TASKS_DIR, filename), serialiseMd(frontmatter, body), "utf8");
  res.status(201).json({ id, _filename: filename });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Kanban server running at http://localhost:${PORT}`);
  console.log(`   Knowns dir: ${KNOWNS_DIR}`);
  console.log(`   Tasks dir:  ${TASKS_DIR}`);
});
