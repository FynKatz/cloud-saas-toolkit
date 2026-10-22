#!/bin/sh
# net-doctor.sh — 判定「某个域名从我这个 shell 到底通不通、卡在哪一层」
#
# 背景：本机在公司 PAC 代理后，shell 与浏览器的网络能力并不等价。
# 只看一次 curl 失败就断言"平台被封锁"是错的，必须按层查。
#
# 用法：  sh scripts/net-doctor.sh <host> [<host> ...]
# 例：    sh scripts/net-doctor.sh api.supabase.com mtsddbmrnwmmyrafqhkw.supabase.co
#
# 输出四步 ladder 的判定结果，最后给出结论与建议通道。
#
# 关键教训（2026-10-22 修正）：第 3 步的 407 只说明「缺认证」，不说明「到不了」。
# 必须走到第 4 步——找现成的内嵌凭据代理（git config http.*.proxy）复测，
# 通了就 shell 自助。曾经只测到 407 就误判为「只能走浏览器 / 平台封锁」。

set -u

if [ "$#" -eq 0 ]; then
  echo "usage: sh $0 <host> [<host> ...]" >&2
  exit 2
fi

PROBE_TIMEOUT=8

echo "============================================================"
echo " net-doctor  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# ---------- Step 1: shell 代理环境变量 ----------
echo
echo "[1] shell 代理环境变量"
FOUND_PROXY=0
for v in http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY; do
  eval "val=\${$v:-}"
  if [ -n "$val" ]; then echo "    $v=$val"; FOUND_PROXY=1; fi
done
NO_PROXY_VAL="${no_proxy:-${NO_PROXY:-}}"
if [ -n "$NO_PROXY_VAL" ]; then
  echo "    no_proxy=$NO_PROXY_VAL"
  echo "    注意：只有 no_proxy、没有 http_proxy/https_proxy 时，curl 会尝试【直连】而非走代理。"
fi
[ "$FOUND_PROXY" -eq 0 ] && echo "    (未发现 http/https 代理变量 → curl 默认直连)"

# ---------- Step 2: 系统 PAC / 代理配置 ----------
echo
echo "[2] macOS 系统代理 (scutil --proxy)"
if command -v scutil >/dev/null 2>&1; then
  scutil --proxy 2>/dev/null | sed 's/^/    /'
  PAC=$(scutil --proxy 2>/dev/null | awk -F': ' '/ProxyAutoConfigURLString/{print $2}')
  if [ -n "${PAC:-}" ]; then
    echo
    echo "    PAC: $PAC"
    if curl -s --max-time "$PROBE_TIMEOUT" "$PAC" -o /tmp/.net-doctor.pac 2>/dev/null; then
      echo "    PAC 默认出口（最后几条 return）:"
      grep -n 'return "' /tmp/.net-doctor.pac | tail -3 | sed 's/^/      /'
    else
      echo "    PAC 拉取失败"
    fi
  fi
else
  echo "    scutil 不可用（非 macOS？）"
fi

# ---------- Step 3: 逐 host 探测 ----------
for HOST in "$@"; do
  echo
  echo "------------------------------------------------------------"
  echo "[3] 探测 $HOST"

  DIRECT=$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' --max-time "$PROBE_TIMEOUT" "https://$HOST/" 2>/dev/null)
  drc=$?
  if [ "$drc" -eq 0 ] && [ "$DIRECT" != "000" ]; then
    echo "    直连        : HTTP $DIRECT  → 可达，无需代理"
  else
    echo "    直连        : 失败 (curl exit=$drc, code=$DIRECT) → shell 无直连路由"
  fi

  if [ -n "${PAC:-}" ] && [ -f /tmp/.net-doctor.pac ]; then
    PX=$(grep -o 'PROXY [0-9a-zA-Z._-]*:[0-9]*' /tmp/.net-doctor.pac | tail -1 | awk '{print $2}')
  else
    PX=""
  fi
  if [ -n "${PX:-}" ]; then
    echo "    经代理 $PX"
    VERBOSE=$(curl -sv --max-time "$PROBE_TIMEOUT" -x "http://$PX" "https://$HOST/" 2>&1)
    CODE=$(printf '%s' "$VERBOSE" | awk '/HTTP\/[0-9.]+ [0-9]+/{print $2; exit}')
    if printf '%s' "$VERBOSE" | grep -q '407'; then
      echo "    经代理      : 407 Proxy Authentication Required"
      printf '%s' "$VERBOSE" | grep -i 'Proxy-Authenticate' | sed 's/^/                    /'
      echo "    → 代理要求域账号认证。未带凭据必然 407，但这不代表 shell 到不了。"
      echo "    → 继续看第 4 步有没有现成凭据。"
    elif [ -n "${CODE:-}" ] && [ "$CODE" != "000" ]; then
      echo "    经代理      : HTTP $CODE  → 可达"
    else
      echo "    经代理      : 失败"
    fi
  fi
done

# ---------- Step 4: 用现成内嵌凭据的代理复测（决定性一步） ----------
echo
echo "[4] 带域凭据复测（凭据不回显）"
PXAUTH_URL=""
for k in $(git config --get-regexp '^http\..*\.proxy$' 2>/dev/null | awk '{print $1}'); do
  v=$(git config --get "$k")
  case "$v" in *://*:*@*) PXAUTH_URL="$v"; break ;; esac
done
if [ -z "$PXAUTH_URL" ]; then
  for e in https_proxy HTTPS_PROXY http_proxy HTTP_PROXY; do
    eval "v=\${$e:-}"
    case "${v:-}" in *://*:*@*) PXAUTH_URL="$v"; break ;; esac
  done
fi

if [ -z "$PXAUTH_URL" ]; then
  echo "    未找到内嵌凭据的代理（git config http.*.proxy / env）"
  echo "    → 若第 3 步是 407：走浏览器兜底通道 scripts/supabase-cdp.mjs"
else
  echo "    找到内嵌凭据的代理（来源 git config http.*.proxy），值已隐藏"
  for HOST in "$@"; do
    C=$(curl -s -o /dev/null -w '%{http_code}' --max-time "$PROBE_TIMEOUT" -x "$PXAUTH_URL" "https://$HOST/" 2>/dev/null)
    if [ -z "$C" ] || [ "$C" = "000" ]; then
      echo "    $HOST -> 不可达（代理放行但上游连不上 = 真被拦）"
    else
      echo "    $HOST -> HTTP $C  ★ 可达（404/401 也算通，只是路径或鉴权）"
    fi
  done
  echo
  echo "    ★ 这一步通 → shell 可自助，不需要浏览器绕路。"
  echo "      Supabase SQL：sh scripts/supa-sql.sh \"<sql>\""
fi

echo
echo "============================================================"
echo " 判读顺序（每次都按这四步，别跳）"
echo "  1. env 有没有 http_proxy/https_proxy —— 没有则 curl 在直连，失败不代表被墙"
echo "  2. scutil --proxy 看 PAC 与默认出口"
echo "  3. 显式 -x <proxy>（不带凭据）：407 = 缺认证，≠ 到不了"
echo "  4. 用现成内嵌凭据的代理复测：通了 → shell 自助；仍不通 → 才考虑浏览器 CDP"
echo "     Supabase SQL 首选通道：sh scripts/supa-sql.sh \"<sql>\""
echo "     浏览器兜底通道：       node scripts/supabase-cdp.mjs sql \"<sql>\""
echo "============================================================"
