#!/usr/bin/env node
/*
 * netlify-deploy.mjs — 用 Netlify Deploy API 直接上传构建产物。
 *
 * 为什么需要：本网络到 GitHub 不稳定（见 docs/runbook-corporate-network.md §3），
 * 而 git 触发的构建依赖 GitHub push。直传 dist 可绕开整条 git 链路，
 * 先验证「产物是否真能跑」，不必先动 prod 分支。
 *
 * 传输层用 curl 而非 Node fetch：本机 Node 22 的 fetch(undici) 不读
 * HTTPS_PROXY 环境变量，且 undici 不作为模块可导入，只有 curl 能走
 * 公司代理（凭据复用 git config 里那份，不回显）。
 *
 * 用法：
 *   node scripts/netlify-deploy.mjs [--dir frontend/dist] [--site <name|id>] [--publish]
 */
import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const DIST = opt('dir', 'frontend/dist');
const SITE = opt('site', 'cloud-saas-toolkit');
const PUBLISH = args.includes('--publish');

const readKey = (file, key) => {
  try {
    const m = readFileSync(file, 'utf8').match(new RegExp('^' + key + '=(.*)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch { return ''; }
};

const TOKEN = readKey('.env.secrets', 'NETLIFY_AUTH_TOKEN');
if (!TOKEN) { console.error('ERROR: NETLIFY_AUTH_TOKEN missing in .env.secrets'); process.exit(1); }

let PROXY = process.env.SUPA_PROXY || '';
if (!PROXY) {
  try {
    const out = execFileSync('git', ['config', '--get-regexp', '^http\\..*\\.proxy$'], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const v = line.trim().split(/\s+/)[1];
      if (v && v.includes('://') && v.includes('@')) { PROXY = v; break; }
    }
  } catch { /* none */ }
}

const API = 'https://api.netlify.com/api/v1';

/** curl a Netlify API call; returns parsed JSON. */
function api(method, path, body, extraHeaders) {
  const tmp = body !== undefined ? `/tmp/nd-${process.pid}-${Math.random().toString(36).slice(2)}.json` : null;
  if (tmp) writeFileSync(tmp, JSON.stringify(body));
  const argv = ['-sS'];
  if (PROXY) argv.push('-x', PROXY);
  argv.push('--max-time', '90', '-X', method);
  argv.push('-H', `Authorization: Bearer ${TOKEN}`);
  for (const h of extraHeaders || []) argv.push('-H', h);
  if (tmp) argv.push('-H', 'content-type: application/json', '-d', `@${tmp}`);
  argv.push('-w', '\n__CODE_%{http_code}', API + path);
  let out = '';
  try { out = execFileSync('curl', argv, { encoding: 'utf8', maxBuffer: 64 << 20 }); }
  finally { if (tmp) try { unlinkSync(tmp); } catch {} }
  const nl = out.lastIndexOf('\n__CODE_');
  const code = Number(out.slice(nl + 8).trim());
  const text = out.slice(0, nl);
  if (code < 200 || code >= 300) {
    let msg = text.slice(0, 300);
    try { msg = JSON.parse(text).message || msg; } catch {}
    throw new Error(`${method} ${path} -> HTTP ${code}: ${msg}`);
  }
  try { return JSON.parse(text); } catch { return text; }
}

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

// 1. resolve site id
let siteId = SITE;
if (!/^[0-9a-f-]{36}$/.test(SITE)) {
  const sites = api('GET', '/sites?filter=all');
  const hit = sites.find(s => s.name === SITE || s.id === SITE);
  if (!hit) throw new Error(`site not found: ${SITE} (have: ${sites.map(s => s.name).join(', ')})`);
  siteId = hit.id;
}
console.log(`site   : ${SITE} (${siteId})`);

// 2. digest dist
const files = walk(DIST);
if (!files.length) throw new Error(`no files under ${DIST} — run: npm --prefix frontend run build`);
const digests = {};
for (const f of files) {
  digests['/' + relative(DIST, f).split(sep).join('/')] = createHash('sha1').update(readFileSync(f)).digest('hex');
}
console.log(`files  : ${files.length} under ${DIST}`);

// 3. create deploy
// NOTE: for this site the Deploy API publishes by default — omitting `draft`
// silently replaced the live version on 2026-10-22. Always send draft:true
// unless the caller explicitly asked to publish.
const deploy = api('POST', `/sites/${siteId}/deploys`, {
  files: digests,
  draft: !PUBLISH,
});
console.log(`deploy : ${deploy.id} state=${deploy.state}`);
console.log(`url    : ${deploy.ssl_url || deploy.url || deploy.browse_url}`);

// 4. upload files the API says are missing.
// This API version returns `required` as a flat array of SHA1s (not path→upload_url),
// so we resolve each sha back to its path(s) and use the per-file endpoint
//   PUT /api/v1/deploys/{id}/files/{path}?sha={sha1}
// Verified working 2026-10-22. (Do NOT shell out to `shasum` here — it crashes on
// this machine's locale; hashes are computed with node:crypto above.)
const need = Array.isArray(deploy.required) ? deploy.required : Object.keys(deploy.required || {});
const bySha = new Map();
for (const [path, sha] of Object.entries(digests)) {
  if (!bySha.has(sha)) bySha.set(sha, []);
  bySha.get(sha).push(path);
}
const todo = [];
for (const sha of need) for (const path of bySha.get(sha) || []) todo.push({ path, sha });
console.log(`upload : ${todo.length} file(s) (required sha: ${need.length})`);
for (const { path, sha } of todo) {
  const local = join(DIST, path.replace(/^\//, ''));
  const argv = ['-sS'];
  if (PROXY) argv.push('-x', PROXY);
  argv.push('--max-time', '180', '-X', 'PUT',
    '-H', `Authorization: Bearer ${TOKEN}`,
    '--data-binary', `@${local}`, '-w', '__CODE_%{http_code}', '-o', '/dev/null',
    `${API}/deploys/${deploy.id}/files${path}?sha=${sha}`);
  const code = Number(execFileSync('curl', argv, { encoding: 'utf8' }).replace('__CODE_', '').trim());
  if (code < 200 || code >= 300) throw new Error(`upload ${path} -> HTTP ${code}`);
  process.stdout.write('.');
}
if (todo.length) console.log(' done');

// 5. publish
if (PUBLISH) {
  // 实测（2026-11-13）：直传产生的 deploy 落在 site 的 prod 分支上，上传完即自动转
  // state=ready 并成为 published_deploy，**不需要**额外调用发布接口。
  // 旧代码这里调 POST /sites/{id}/main —— 该端点不存在，恒返回 404，
  // 于是「线上其实已经更新成功」也会被抛出的异常掩盖成部署失败。
  // 因此改成：轮询真实状态 -> 仅在确实是 lock/draft 时才 unlock+restore -> 以
  // published_deploy.id 是否等于本次 deploy 作为唯一成功判据。
  let cur = deploy;
  for (let i = 0; i < 60; i++) {
    cur = api('GET', `/deploys/${deploy.id}`);
    if (cur.state === 'ready' || cur.state === 'error') break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (cur.state === 'error') {
    throw new Error(`deploy ${deploy.id} state=error: ${(cur.error_message || 'unknown').slice(0, 200)}`);
  }
  // 只有真的被锁成 draft 时才需要 unlock / restore；正常情况下这两个都不会触发。
  if (cur.draft || cur.state === 'uploaded') {
    try { api('POST', `/deploys/${deploy.id}/unlock`, {}); } catch { /* not locked */ }
    try { api('POST', `/deploys/${deploy.id}/restore`, {}); } catch { /* already live */ }
    for (let i = 0; i < 30; i++) {
      cur = api('GET', `/deploys/${deploy.id}`);
      if (cur.state === 'ready') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  const site = api('GET', `/sites/${siteId}`);
  const publishedId = (site.published_deploy || {}).id;
  if (publishedId !== deploy.id) {
    throw new Error(`未上线：published_deploy=${publishedId} 而非本次 ${deploy.id}（state=${cur.state}）`);
  }
  const live = site.published_deploy.ssl_url || site.published_deploy.url || site.ssl_url || site.url;
  console.log(`PUBLISHED -> ${live} (state=${cur.state}, deploy=${deploy.id})`);
} else {
  console.log('draft deploy — 未影响线上主版本。加 --publish 才上线。');
}
