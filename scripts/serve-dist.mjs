#!/usr/bin/env node
/*
 * serve-dist.mjs — 带 SPA 回退的静态服务器，用于本地验证【构建产物】。
 *
 * 为什么不用 npm run dev 做验收：Vite dev 按需编译，第一次访问某个路由要把该
 * 视图及其 JSON 依赖现编译一遍，自动化里容易测出「未挂载」这类假故障；生产是
 * 静态 chunk，行为不同。测产物才是上线前真正该验的东西。
 *
 * 为什么不用 python -m http.server：它没有 SPA 回退，/parking 这类深链会 404，
 * 而 Vue Router 用的是 createWebHistory。
 *
 * 用法：node scripts/serve-dist.mjs [port] [distDir]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.argv[2] || 4173);
const ROOT = resolve(process.argv[3] || 'frontend/dist');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  // Block path traversal, then try the exact file.
  let file = normalize(join(ROOT, pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
    return;
  } catch { /* fall through to SPA rewrite */ }
  try {
    const html = await readFile(join(ROOT, 'index.html'));
    res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
    res.end(html);
  } catch {
    res.writeHead(404).end('not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} at http://127.0.0.1:${PORT} (SPA fallback on)`);
});
