#!/bin/sh
# supa-ego-cli.sh — 包装脚本：读 stdin JSON，注入 ego-browser nodejs 运行 supa-ego.mjs。
#
# 用法：
#   printf '%s' '{"cmd":"tabs"}' | sh scripts/supa-ego-cli.sh
#   printf '%s' '{"sql":"select 1"}' | sh scripts/supa-ego-cli.sh
#   printf '%s' '{"file":"supabase/migrations/xxx.sql"}' | sh scripts/supa-ego-cli.sh

set -e

JSON=$(cat)
B64=$(printf '%s' "$JSON" | base64)
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

ego-browser nodejs -e "
globalThis.__payload = JSON.parse(Buffer.from('$B64', 'base64').toString('utf8'))
await import('file://$SCRIPT_DIR/supa-ego.mjs')
"
