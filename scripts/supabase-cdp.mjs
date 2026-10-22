#!/usr/bin/env node
/*
 * supabase-cdp.mjs — 在【已登录的 Supabase dashboard 标签页】里执行 SQL。
 *
 * 为什么需要它：本机 shell 到 Supabase 走不通（公司代理要 NTLM 域认证，见
 * scripts/net-doctor.sh 与 docs/runbook-corporate-network.md）。浏览器持有域凭据
 * 且已登录 dashboard，所以把浏览器当执行通道。
 *
 * 用法：
 *   node scripts/supabase-cdp.mjs tabs
 *   node scripts/supabase-cdp.mjs sql "select 1"
 *   node scripts/supabase-cdp.mjs sql --file supabase/migrations/xxx.sql
 *   node scripts/supabase-cdp.mjs sql "..." --tab <targetId> --json
 *
 * 前置：Test Chrome 以 CDP 端口运行（默认 9231，可用 SUPA_CDP_PORT 覆盖），
 *      且其中有一个已登录 supabase.com/dashboard 的标签页。
 */

const PORT = process.env.SUPA_CDP_PORT || '9231';
const BASE = `http://127.0.0.1:${PORT}`;
const PROJECT_REF = process.env.SUPA_PROJECT_REF || 'mtsddbmrnwmmyrafqhkw';
const SQL_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

const argv = process.argv.slice(2);
const cmd = argv[0];

function parseFlags(list) {
  const out = { flags: {}, pos: [] };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--tab') out.flags.tab = list[++i];
    else if (a === '--file') out.flags.file = list[++i];
    else if (a === '--json') out.flags.json = true;
    else if (a === '--timeout') out.flags.timeout = Number(list[++i]);
    else out.pos.push(a);
  }
  return out;
}

async function targets() {
  const r = await fetch(`${BASE}/json/list`);
  return (await r.json()).filter(x => x.type === 'page');
}

/** Connect to a tab, returning a call(method, params) fn plus a close(). */
async function attach(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('ws connect failed')), { once: true });
  });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    }
  });
  const call = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async expression => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error('page JS: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails).slice(0, 300));
    }
    return r.result.value;
  };
  return { call, evalJs, close: () => ws.close() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Find a Supabase SQL-editor tab, or open one. */
async function ensureSqlTab(forced) {
  let list = await targets();
  if (forced) {
    const t = list.find(x => x.id === forced);
    if (!t) throw new Error('tab not found: ' + forced);
    return t;
  }
  let t = list.find(x => /supabase\.com\/dashboard/.test(x.url || '') && /\/sql\//.test(x.url || ''));
  if (!t) t = list.find(x => /supabase\.com\/dashboard/.test(x.url || ''));
  if (!t) {
    process.stderr.write(`no supabase tab; opening ${SQL_URL}\n`);
    const r = await fetch(`${BASE}/json/new?${encodeURIComponent(SQL_URL)}`, { method: 'PUT' });
    t = await r.json();
    // SPA needs real time; poll for readiness below rather than a fixed sleep.
    await sleep(4000);
  }
  return t;
}

/** Wait until Monaco is present and a Run button exists. */
async function waitForEditor(evalJs, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const ok = await evalJs(`(() => {
      const m = (typeof window.monaco === 'object' && monaco.editor.getModels().length > 0);
      const b = [...document.querySelectorAll('button')].some(x => /^run/i.test((x.innerText||'').trim()));
      return JSON.stringify({ m, b });
    })()`).catch(() => '{"m":false,"b":false}');
    const s = JSON.parse(ok);
    if (s.m && s.b) return true;
    await sleep(1500);
  }
  throw new Error('SQL editor not ready (monaco/Run button missing). Is the tab logged in? Session may have expired.');
}

const PROBE = `(() => {
  const rows = [...document.querySelectorAll('.rdg-row')].map(r =>
    [...r.querySelectorAll('.rdg-cell,[role=gridcell]')].map(c => c.textContent.trim()));
  const flat = [...document.querySelectorAll('.rdg-cell,[role=gridcell]')].map(c => c.textContent.trim());
  const txt = document.body.innerText;
  const status = (txt.match(/(Run succeeded[^\\n]*|Run failed[^\\n]*|Error:[^\\n]*|SQL Execution Error[^\\n]*|\\d+ rows\\(Limited[^\\n]*|Finished [^\\n]*ms[^\\n]*)/i) || [null])[0];
  const err = (txt.match(/(Failed running the query[^\\n]*|column "[^"]*" does not exist[^\\n]*|syntax error[^\\n]*)/i) || [null])[0];
  return JSON.stringify({ rows, flat, status, err, running: /Running\\.\\.\\./.test(txt) });
})()`;

async function run(sql, opts) {
  const tab = await ensureSqlTab(opts.tab);
  const { call, evalJs, close } = await attach(tab.webSocketDebuggerUrl);
  try {
    await call('Runtime.enable');
    await waitForEditor(evalJs, opts.timeout);

    await evalJs(`(() => { monaco.editor.getModels()[0].setValue(${JSON.stringify(sql)}); return 1 })()`);

    const clicked = await evalJs(`(() => {
      const b = [...document.querySelectorAll('button')].find(x => /^run/i.test((x.innerText||'').trim()));
      if (!b) return 'no-run-button';
      b.click(); return 'clicked';
    })()`);
    if (clicked !== 'clicked') throw new Error('could not click Run');

    const end = Date.now() + Math.max(opts.timeout, 60000);
    let last = null;
    while (Date.now() < end) {
      await sleep(1200);
      last = JSON.parse(await evalJs(PROBE));
      if (last.err) break;
      if (!last.running && (last.status || last.rows.length || last.flat.length)) break;
    }
    return { tabId: tab.id, tabUrl: tab.url, ...last };
  } finally {
    close();
  }
}

function printTable(res, asJson) {
  if (asJson) { console.log(JSON.stringify(res, null, 1)); return; }
  const rows = res.rows?.length ? res.rows : null;
  if (res.err) { console.log('ERROR: ' + res.err); }
  console.log('status: ' + (res.status || '(none)'));
  if (rows) {
    const w = [];
    for (const r of rows) r.forEach((c, i) => { w[i] = Math.max(w[i] || 0, String(c).length); });
    for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(w[i])).join(' | '));
    console.log(`(${rows.length} row groups rendered; grid is virtualized — narrow the query if you need more)`);
  } else if (res.flat?.length) {
    console.log(res.flat.join('\n'));
  } else {
    console.log('(no result set — DDL/DML statement)');
  }
}

const { flags, pos } = parseFlags(argv.slice(1));

if (cmd === 'tabs') {
  for (const t of await targets()) {
    console.log(t.id, '|', (t.title || '').slice(0, 60), '|', (t.url || '').slice(0, 90));
  }
} else if (cmd === 'sql') {
  let sql = flags.file ? (await import('node:fs')).readFileSync(flags.file, 'utf8') : pos.join(' ');
  if (!sql?.trim()) { console.error('no SQL given'); process.exit(2); }
  const res = await run(sql, { tab: flags.tab, timeout: flags.timeout || 45000 });
  printTable(res, flags.json);
} else {
  console.log(`usage:
  node scripts/supabase-cdp.mjs tabs
  node scripts/supabase-cdp.mjs sql "<statement>" [--tab <id>] [--json] [--timeout ms]
  node scripts/supabase-cdp.mjs sql --file <path.sql>

env: SUPA_CDP_PORT (default 9231), SUPA_PROJECT_REF (default ${PROJECT_REF})`);
}
