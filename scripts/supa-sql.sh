#!/bin/sh
# supa-sql.sh — 通过 Supabase Management API 执行 SQL（本机首选通道）。
#
# 前提：公司代理需要 AD 域认证，凭据已存在于 git config 的
#       http.<url>.proxy 里（见 scripts/net-doctor.sh 的说明）。
#       本脚本复用它，因此 shell 也能直达 Supabase，无需浏览器。
#
# 用法：
#   sh scripts/supa-sql.sh "select count(*) from public.tools"
#   sh scripts/supa-sql.sh --file supabase/migrations/xxx.sql
#   echo "select 1" | sh scripts/supa-sql.sh -
#
# 可覆盖：SUPA_PROXY / SUPA_TOKEN_FILE / SUPA_PROJECT_REF
# 安全：本脚本不打印代理凭据与 token。

set -u

REF="${SUPA_PROJECT_REF:-mtsddbmrnwmmyrafqhkw}"
TOKEN_FILE="${SUPA_TOKEN_FILE:-supabase_token.txt}"

# --- proxy: env 优先，否则从 git config 取（值不回显）---
if [ -n "${SUPA_PROXY:-}" ]; then
  PX="$SUPA_PROXY"
else
  PX=$(git config --get 'http.https://gitee.com.proxy' 2>/dev/null)
fi
if [ -z "${PX:-}" ]; then
  echo "ERROR: no proxy. Set SUPA_PROXY or configure git http.<url>.proxy" >&2
  exit 1
fi

# --- token ---
if [ ! -s "$TOKEN_FILE" ]; then
  echo "ERROR: token file not found/empty: $TOKEN_FILE" >&2
  exit 1
fi
TOK=$(tr -d '\n\r ' < "$TOKEN_FILE")

# --- sql input ---
MODE="${1:-}"
case "$MODE" in
  --file)
    [ -n "${2:-}" ] || { echo "ERROR: --file needs a path" >&2; exit 2; }
    [ -f "$2" ] || { echo "ERROR: no such file: $2" >&2; exit 2; }
    SQL=$(cat "$2")
    ;;
  -)
    SQL=$(cat)
    ;;
  "")
    echo "usage: sh $0 \"<sql>\" | --file <path> | -" >&2
    exit 2
    ;;
  *)
    SQL="$MODE"
    ;;
esac

if [ -z "$SQL" ]; then echo "ERROR: empty SQL" >&2; exit 2; fi

# Build the JSON body safely via python-free escaping: use printf + sed is fragile,
# so hand it to node for JSON encoding.
BODY=$(SQL="$SQL" node -e 'process.stdout.write(JSON.stringify({query: process.env.SQL}))')

RESP=$(curl -s -w '\n__HTTP_%{http_code}' --max-time 60 \
  -x "$PX" \
  -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOK" \
  -H "content-type: application/json" \
  -d "$BODY")

CODE=$(printf '%s' "$RESP" | tail -1 | sed 's/.*__HTTP_//')
OUT=$(printf '%s' "$RESP" | sed '$d')

echo "HTTP $CODE"
case "$CODE" in
  2*) printf '%s\n' "$OUT" ;;
  401|403) echo "ERROR: token rejected/expired. Refresh $TOKEN_FILE, or fall back to" >&2
           echo "       scripts/supabase-cdp.mjs (browser channel). See runbook." >&2; exit 1 ;;
  *)  printf '%s\n' "$OUT" >&2; exit 1 ;;
esac
