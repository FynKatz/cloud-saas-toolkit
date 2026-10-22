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
#
# 也不要只依赖重试：git push 本身没有超时，代理半死时会永久挂起
# （2026-10-22 实测卡住 12 分钟无输出）。这里用 http.lowSpeed* 让停滞连接中断，
# 才能真的进入下一轮重试。

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
# A stalled corporate proxy can make CONNECT hang forever; abort when the
# transfer stays under 1KB/s for 25s so the retry loop can actually fire.
# POSIX-safe: no bash arrays, this script is invoked with `sh`.
    i=1
    while [ "$i" -le "$RETRIES" ]; do
      if OUT=$(git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=25 push "$R" "$B" 2>&1); then
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
