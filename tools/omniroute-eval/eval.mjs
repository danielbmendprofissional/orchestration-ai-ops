#!/usr/bin/env node
// Avaliação empírica dos modelos do OmniRoute pro papel de executor do pi.dev.
// Mede o que o pi precisa: tool calling multi-turn, editar arquivo certo, escrever teste que pega bug.
// Uso: ver README.md desta pasta.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------- args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : true];
  })
);
const BASE_URL = (args["base-url"] || process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1").replace(/\/$/, "");
const API_KEY = process.env.OMNIROUTE_EVAL_KEY || process.env.OMNIROUTE_API_KEY;
const RUNS = Number(args.runs || 2);
const MODELS_FILE = args.models || join(HERE, "models.txt");
const ONLY_TASK = args.task;
const TIMEOUT_MS = Number(args.timeout || 120000);
const MAX_TURNS = 6;

if (!API_KEY) {
  console.error("Falta OMNIROUTE_EVAL_KEY (ou OMNIROUTE_API_KEY). Cadastre com setx e reabra o terminal.");
  process.exit(2);
}

const models = readFileSync(MODELS_FILE, "utf8")
  .split(/\r?\n/)
  .map((l) => l.replace(/#.*/, "").trim())
  .filter(Boolean)
  .filter((m) => (args.model ? m === args.model : true));

// ---------- tools simuladas ----------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 file from the repository.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a UTF-8 file in the repository with the full content.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List files under a directory of the repository.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
];

const SYSTEM =
  "You are a coding agent working inside a repository. You can only see and change files through the provided tools. " +
  "Always use tools to read files before answering about them and to write files when asked to change code. " +
  "When you are done, reply with a short final message and no tool calls.";

const norm = (p) => String(p || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "");

// ---------- tarefas ----------
const LEAP_OK = "function isLeapYear(y) {\n  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;\n}\nmodule.exports = { isLeapYear };\n";
const LEAP_MUTANTS = [
  "function isLeapYear(y) { return y % 4 === 0; }\nmodule.exports = { isLeapYear };\n",
  "function isLeapYear(y) { return y % 4 === 0 && y % 100 !== 0; }\nmodule.exports = { isLeapYear };\n",
  "function isLeapYear(y) { return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) && y !== 2000; }\nmodule.exports = { isLeapYear };\n",
];

const SLUG_HIDDEN_TEST = `
const assert = require("node:assert");
const { slugify } = require("./src/slugify.js");
assert.strictEqual(slugify("  Olá Mundo!  "), "ola-mundo");
assert.strictEqual(slugify("Café com Leite"), "cafe-com-leite");
assert.strictEqual(slugify("a--b"), "a-b");
assert.strictEqual(slugify("Já_é 2026"), "ja-e-2026");
assert.strictEqual(slugify("---"), "");
`;

const TASKS = {
  "tool-read": {
    desc: "tool call multi-turn: achar um valor lendo arquivos",
    files: {
      "README.md": "# demo\nConfig lives under config/.\n",
      "config/app.json": '{ "name": "demo", "port": 8743, "debug": false }\n',
      "config/db.json": '{ "host": "localhost", "port": 5432 }\n',
    },
    prompt: "Which HTTP port does the app use? It is configured somewhere under config/. Answer with just the number.",
    check: ({ finalText }) => ({ ok: /\b8743\b/.test(finalText) && !/\b5432\b/.test(finalText), why: "resposta final deve ser 8743" }),
  },
  "fix-bug": {
    desc: "editar o arquivo certo via write_file e passar teste oculto",
    files: {
      "src/slugify.js": "function slugify(s) {\n  return s.toLowerCase().replace(/ /g, \"-\");\n}\nmodule.exports = { slugify };\n",
    },
    prompt:
      "src/slugify.js is wrong. Spec for slugify(s): lowercase; remove accents (á->a, é->e, ç->c...); every run of characters " +
      "outside [a-z0-9] becomes a single '-'; no leading or trailing '-'. Fix the file with write_file. Keep the CommonJS export.",
    check: ({ written }) => {
      const code = written["src/slugify.js"];
      if (!code) return { ok: false, why: "não escreveu src/slugify.js" };
      const r = runSandboxed({ "src/slugify.js": code, "check.js": SLUG_HIDDEN_TEST }, "check.js");
      return { ok: r.ok, why: r.ok ? "" : "teste oculto falhou: " + r.err };
    },
  },
  "write-test": {
    desc: "escrever teste que passa na implementação certa e pega mutantes (TDD)",
    files: { "src/isLeapYear.js": LEAP_OK },
    prompt:
      "Write test/isLeapYear.test.js for src/isLeapYear.js using only node:assert or node:test (no external libraries). " +
      "Import with require('../src/isLeapYear.js'). The test file must exit with a non-zero code when the implementation is wrong. Cover the edge cases.",
    check: ({ written }) => {
      const key = Object.keys(written).find((k) => /isLeapYear\.test\.js$/.test(k));
      if (!key) return { ok: false, why: "não escreveu test/isLeapYear.test.js" };
      const t = written[key];
      const good = runSandboxed({ "src/isLeapYear.js": LEAP_OK, "test/isLeapYear.test.js": t }, "test/isLeapYear.test.js");
      if (!good.ok) return { ok: false, why: "teste falha na implementação correta: " + good.err };
      const killed = LEAP_MUTANTS.filter(
        (m) => !runSandboxed({ "src/isLeapYear.js": m, "test/isLeapYear.test.js": t }, "test/isLeapYear.test.js").ok
      ).length;
      return { ok: killed >= 2, why: `mutantes mortos ${killed}/${LEAP_MUTANTS.length}`, extra: { killed } };
    },
  },
};

// ---------- sandbox pro código gerado ----------
// Node permission model: sem escrita em disco, sem rede, sem child process; leitura só na pasta temporária.
function runSandboxed(files, entry) {
  const dir = mkdtempSync(join(tmpdir(), "omni-eval-"));
  try {
    for (const [p, c] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, p)), { recursive: true });
      writeFileSync(join(dir, p), c);
    }
    const r = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${dir}`, join(dir, entry)], {
      cwd: dir,
      timeout: 10000,
      encoding: "utf8",
    });
    const err = (r.stderr || r.error?.message || "").split("\n").find((l) => l.trim()) || `exit ${r.status}`;
    return { ok: r.status === 0, err: err.slice(0, 160) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- loop do agente ----------
async function chat(model, messages) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.2, max_tokens: 4096, stream: false }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function runTask(model, task) {
  const fs = { ...task.files };
  const written = {};
  const messages = [{ role: "system", content: SYSTEM }, { role: "user", content: task.prompt }];
  const t0 = Date.now();
  let toolCalls = 0, badArgs = 0, servedModel = null, tokens = { in: 0, out: 0 };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const r = await chat(model, messages);
    if (r.status === 429) return { result: "rate-limited", ms: Date.now() - t0, why: "429" };
    if (r.status !== 200 || !r.json?.choices?.[0]) {
      return { result: "error", ms: Date.now() - t0, why: `HTTP ${r.status}: ${String(r.text).slice(0, 140)}` };
    }
    servedModel = r.json.model || servedModel;
    tokens.in += r.json.usage?.prompt_tokens || 0;
    tokens.out += r.json.usage?.completion_tokens || 0;
    const msg = r.json.choices[0].message || {};
    const calls = msg.tool_calls || [];
    messages.push({ role: "assistant", content: msg.content ?? "", ...(calls.length ? { tool_calls: calls } : {}) });

    if (!calls.length) {
      const finalText = String(msg.content || "");
      if (toolCalls === 0) return { result: "fail", ms: Date.now() - t0, why: "respondeu sem usar tool", servedModel, tokens };
      const c = task.check({ finalText, written });
      return { result: c.ok ? "pass" : "fail", ms: Date.now() - t0, why: c.why, servedModel, tokens, toolCalls, badArgs, ...c.extra };
    }

    for (const call of calls) {
      toolCalls++;
      let a;
      try { a = JSON.parse(call.function?.arguments || "{}"); } catch { a = null; }
      let out;
      if (!a) { badArgs++; out = "ERROR: arguments are not valid JSON"; }
      else if (call.function.name === "read_file") out = fs[norm(a.path)] ?? `ERROR: file not found: ${a.path}`;
      else if (call.function.name === "list_dir") {
        const d = norm(a.path).replace(/\/$/, "");
        const ls = Object.keys(fs).filter((p) => (d && d !== "." ? p.startsWith(d + "/") : true));
        out = ls.length ? ls.join("\n") : "(empty)";
      } else if (call.function.name === "write_file") {
        fs[norm(a.path)] = written[norm(a.path)] = String(a.content ?? "");
        out = "OK";
      } else { badArgs++; out = `ERROR: unknown tool ${call.function?.name}`; }
      messages.push({ role: "tool", tool_call_id: call.id, content: out });
    }
  }
  // estourou turnos: ainda avalia o que foi escrito (tarefas de escrita)
  const c = task.check({ finalText: "", written });
  return { result: c.ok ? "pass" : "fail", ms: Date.now() - t0, why: `sem mensagem final em ${MAX_TURNS} turnos; ${c.why}`, servedModel, tokens, toolCalls, badArgs };
}

// ---------- main ----------
const taskNames = Object.keys(TASKS).filter((t) => !ONLY_TASK || t === ONLY_TASK);
const results = [];
console.log(`OmniRoute ${BASE_URL} — ${models.length} modelos × ${taskNames.length} tarefas × ${RUNS} runs\n`);

for (const model of models) {
  for (const tn of taskNames) {
    for (let i = 0; i < RUNS; i++) {
      const r = await runTask(model, TASKS[tn]);
      results.push({ model, task: tn, run: i + 1, ...r });
      const sub = r.servedModel && !r.servedModel.includes(model.split("/").pop()) ? ` (servido por ${r.servedModel})` : "";
      console.log(`${r.result.padEnd(12)} ${model}  ${tn}#${i + 1}  ${r.ms}ms  ${r.result === "pass" ? "" : r.why || ""}${sub}`);
    }
  }
}

// ---------- relatório ----------
const byModel = {};
for (const r of results) {
  const m = (byModel[r.model] ||= { pass: 0, fail: 0, error: 0, rl: 0, ms: [], tin: 0, tout: 0, tasks: {} });
  if (r.result === "pass") m.pass++;
  else if (r.result === "fail") m.fail++;
  else if (r.result === "rate-limited") m.rl++;
  else m.error++;
  if (r.result === "pass" || r.result === "fail") m.ms.push(r.ms);
  m.tin += r.tokens?.in || 0;
  m.tout += r.tokens?.out || 0;
  const t = (m.tasks[r.task] ||= { pass: 0, n: 0 });
  t.n++;
  if (r.result === "pass") t.pass++;
}
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
const rows = Object.entries(byModel)
  .map(([model, m]) => {
    const attempted = m.pass + m.fail;
    return { model, m, score: attempted ? m.pass / attempted : 0, avail: (m.pass + m.fail) / (m.pass + m.fail + m.error + m.rl), med: median(m.ms) };
  })
  .sort((a, b) => b.score - a.score || b.avail - a.avail || (a.med ?? 1e9) - (b.med ?? 1e9));

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const lines = [
  `# OmniRoute eval — ${new Date().toISOString()}`,
  "",
  `Base: \`${BASE_URL}\` · runs por tarefa: ${RUNS} · tarefas: ${taskNames.join(", ")}`,
  "",
  "Qualidade = pass / (pass+fail), só sobre tentativas que chegaram ao modelo. Disponibilidade = tentativas que chegaram / total (429 e erro HTTP derrubam).",
  "",
  `| # | Modelo | Qualidade | Disponib. | ${taskNames.join(" | ")} | 429 | Erro | Mediana ms | Tokens in/out |`,
  `|---|---|---|---|${taskNames.map(() => "---").join("|")}|---|---|---|---|`,
  ...rows.map(
    (r, i) =>
      `| ${i + 1} | \`${r.model}\` | ${(r.score * 100).toFixed(0)}% | ${(r.avail * 100).toFixed(0)}% | ${taskNames
        .map((t) => (r.m.tasks[t] ? `${r.m.tasks[t].pass}/${r.m.tasks[t].n}` : "-"))
        .join(" | ")} | ${r.m.rl} | ${r.m.error} | ${r.med ?? "-"} | ${r.m.tin}/${r.m.tout} |`
  ),
];
const outDir = join(HERE, "results");
if (!existsSync(outDir)) mkdirSync(outDir);
writeFileSync(join(outDir, `${stamp}.md`), lines.join("\n") + "\n");
writeFileSync(join(outDir, `${stamp}.json`), JSON.stringify(results, null, 2));
console.log("\n" + lines.join("\n"));
console.log(`\nSalvo em results/${stamp}.md e .json`);
