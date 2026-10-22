#!/bin/sh
# push-retry.sh — 带重试的 git push。
#
# 存在理由：本网络到 GitHub 是间歇性可用的（同一命令可能先 503 后成功，
# 实测 2026-10-22 attempt1 失败 / attempt2 成功），单次失败不代表不可用。
# 详见 docs/runbook-corporate-network.md §3。
#
# 用法：sh scripts/push-retry.sh <remote> <branch> [<branch> ...]
#       sh scripts/push-retry.sh --both feature/2610 dev int stg prod
#
# 注意：不要用 `git push ... | tail` 判断成败 —— 管道会把退出码换成
#       tail 的 0，导致失败被误判为成功（本轮真的踩过）。

set -u
RETRIES="${PUSH_RETRIES:-5}"
SLEEP="${PUSH_RETRY_SLEEP:-5}"

if [ "$#" -lt 2 ]; then
  echo "usage: sh $0 <remote>|--both <branch> [...]" >&2
  exit 2
fi

REMOTE="$1"; shift
case "$REMOTE" in
  --both) REMOTES="origin gitee" ;;
  *) REMOTES="$REMOTE" ;;
esac

FAILED=""
for R in $REMOTES; do
  for B in "$@"; do
    i=1
    while [ "$i" -le "$RETRIES" ]; do
      if OUT=$(git push "$R" "$B" 2>&1); then
        echo "OK   $R/$B  (attempt $i)"
        break
      fi
      if [ "$i" -eq "$RETRIES" ]; then
        echo "FAIL $R/$B  after $RETRIES attempts: $(printf '%s' "$OUT" | tail -1)"
        FAILED="$FAILED $R/$B"
      else
        echo "retry $R/$B (attempt $i failed: $(printf '%s' "$OUT" | tail -1 | cut -c1-80))"
        sleep "$SLEEP"
      fi
      i=$((i + 1))
    done
  done
done

if [ -n "$FAILED" ]; then
  echo
  echo "未成功的分支:$FAILED"
  exit 1
fi
echo "全部推送完成。"
