#!/usr/bin/env node
/*
 * supa-ego.mjs — 通过 ego-browser 在【已登录的 Supabase SQL Editor】里执行 SQL。
 *
 * 为什么需要它：公司代理走 AD 域认证，浏览器持有已登录 supabase.com 的会话，
 * 所以浏览器本身是可靠的执行通道；ego-browser 是当前统一的浏览器驱动，
 * 不再依赖 Test Chrome / CDP 端口。
 *
 * 参数约定：ego 的 nodejs 运行环境不继承 shell env，也不读取进程 argv，
 * 因此参数通过 globalThis.__payload 注入（JSON）：
 *   {"cmd":"tabs"}
 *   {"sql":"select 1"}
 *   {"file":"supabase/migrations/xxx.sql"}
 *
 *  由 scripts/supa-ego-cli.sh 读取 stdin JSON 并注入运行本文件。
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const PROJECT_REF = 'mtsddbmrnwmmyrafqhkw'
const SQL_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

const payload = globalThis.__payload || {}

async function main() {
  const task = await taskSpace('cloud-saas-toolkit-supa-sql')
  const page = task.page('p1')

  if (payload.cmd === 'tabs') {
    const tabs = await task.tabs()
    console.log(tabs.map((t) => ({ label: t.label || null, title: t.title, url: t.url })))
    await task.finish({ keep: [] })
    return
  }

  if (payload.cmd !== 'sql' && !payload.sql && !payload.file) {
    console.log(`usage:
  {"cmd":"tabs"}
  {"sql":"select 1"}
  {"file":"supabase/migrations/xxx.sql"}`)
    await task.finish({ keep: [] })
    return
  }

  const sql = payload.file
    ? await readFile(resolve(payload.file), 'utf8')
    : payload.sql
  if (!sql?.trim()) {
    console.error('no SQL given')
    await task.finish({ keep: [] })
    process.exitCode = 2
    return
  }

  const currentUrl = await page.url()
  if (!/supabase\.com\/dashboard/.test(currentUrl || '')) {
    await page.goto(SQL_URL, { timeout: 60_000 })
    await page.waitForURL(/supabase\.com\/dashboard/, { timeout: 60_000 })
  }

  // SQL Editor 是 SPA，等待 Monaco 与 Run 按钮就绪后再注入。
  await page.waitForFunction(
    () => {
      const monacoReady =
        typeof window.monaco === 'object' &&
        typeof window.monaco.editor === 'object' &&
        window.monaco.editor.getModels().length > 0
      const hasRun = [...document.querySelectorAll('button')].some((b) =>
        /^run/i.test((b.innerText || '').trim()),
      )
      return monacoReady && hasRun
    },
    undefined,
    { timeout: payload.timeout || 60_000 },
  )

  await page.evaluate((query) => {
    window.monaco.editor.getModels()[0].setValue(query)
    const run = [...document.querySelectorAll('button')].find((b) =>
      /^run/i.test((b.innerText || '').trim()),
    )
    run?.click()
  }, sql)

  const timeoutMs = Math.max(payload.timeout || 30_000, 30_000)
  const result = await page.waitForFunction(
    () => {
      const txt = document.body.innerText || ''
      const status =
        (txt.match(
          /(Run succeeded[^\n]*|Run failed[^\n]*|Error:[^\n]*|SQL Execution Error[^\n]*|\d+ rows \(Limited[^\n]*|Finished [^\n]*ms[^\n]*)/i,
        ) || [null])[0]
      const err = (txt.match(
        /(Failed running the query[^\n]*|column "[^"]*" does not exist[^\n]*|syntax error[^\n]*)/i,
      ) || [null])[0]
      const running = /Running\.\.\./.test(txt)
      const rows = [...document.querySelectorAll('.rdg-row')].map((r) =>
        [...r.querySelectorAll('.rdg-cell,[role=gridcell]')].map((c) => c.textContent.trim()),
      )
      return JSON.stringify({ status: status || null, err: err || null, running, rows })
    },
    undefined,
    {
      // waitForFunction 无法在等待函数里做 setTimeout，这里只做首次观察；
      // 未完成时由下面循环继续轮询。
      timeout: Math.min(timeoutMs, 5_000),
    },
  )

  let state = JSON.parse(result)
  const started = Date.now()
  while (state.running || (!state.status && !state.err && !state.rows.length)) {
    if (Date.now() - started > timeoutMs) break
    await page.waitForTimeout(1200)
    const current = await page.evaluate(() => {
      const txt = document.body.innerText || ''
      const status =
        (txt.match(
          /(Run succeeded[^\n]*|Run failed[^\n]*|Error:[^\n]*|SQL Execution Error[^\n]*|\d+ rows \(Limited[^\n]*|Finished [^\n]*ms[^\n]*)/i,
        ) || [null])[0]
      const err = (txt.match(
        /(Failed running the query[^\n]*|column "[^"]*" does not exist[^\n]*|syntax error[^\n]*)/i,
      ) || [null])[0]
      const running = /Running\.\.\./.test(txt)
      const rows = [...document.querySelectorAll('.rdg-row')].map((r) =>
        [...r.querySelectorAll('.rdg-cell,[role=gridcell]')].map((c) => c.textContent.trim()),
      )
      return JSON.stringify({ status: status || null, err: err || null, running, rows })
    })
    state = JSON.parse(current)
    if (state.err) break
    if (!state.running && (state.status || state.rows.length)) break
  }

  if (state.err) console.log('ERROR: ' + state.err)
  console.log('status: ' + (state.status || '(none)'))
  if (state.rows.length) {
    for (const row of state.rows) console.log(row.join(' | '))
  } else {
    console.log('(no result set — DDL/DML statement)')
  }

  await task.finish({ keep: [] })
}

main().catch(async (e) => {
  console.error(e?.message || String(e))
  process.exitCode = 1
})
