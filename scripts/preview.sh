#!/bin/sh
# preview.sh — 起/复用本地静态预览服务（幂等，可反复执行）。
#
# 背景：原型 HTML 需要 HTTP 服务才能在浏览器里正常加载；而每次 shell 会话结束，
# 后台 python http.server 会被回收，端口失效，表现为「链接突然打不开」。
# 本脚本每次都会检查端口，活着就复用，死了就重新拉起。
#
# 用法：
#   sh scripts/preview.sh                      # 预览 docs/design/baseline，端口 8899
#   sh scripts/preview.sh <dir> [port]
#
# 说明：baseline 下的 HTML 全部自包含（内联 CSS/JS、无外部依赖、无 fetch），
#      所以直接用 file:// 打开同样可用，且不依赖任何服务 —— 脚本会一并打印该地址。

set -u
DIR="${1:-docs/design/baseline}"
PORT="${2:-8899}"

if [ ! -d "$DIR" ]; then
  echo "ERROR: no such dir: $DIR" >&2
  exit 2
fi
ABS=$(cd "$DIR" && pwd)

alive() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:$PORT/" 2>/dev/null)" = "200" ]
}

if alive; then
  echo "reusing existing server on :$PORT"
else
  # 端口被别的进程占用时不硬抢，换个端口
  if lsof -iTCP:"$PORT" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    OLD=$PORT; PORT=$((PORT + 1))
    echo "port $OLD busy, using $PORT instead"
  fi
  ( cd "$ABS" && nohup python3 -m http.server "$PORT" >/tmp/preview-$PORT.log 2>&1 </dev/null & )
  i=0
  until alive || [ "$i" -ge 20 ]; do sleep 0.3; i=$((i + 1)); done
  if alive; then echo "started server on :$PORT (cwd: $ABS)"
  else echo "ERROR: server did not come up; see /tmp/preview-$PORT.log" >&2; exit 1; fi
fi

echo
echo "可用文件："
for f in "$ABS"/*.html; do
  [ -e "$f" ] || continue
  n=$(basename "$f")
  echo "  http://127.0.0.1:$PORT/$n"
  echo "  file://$ABS/$n"
done
echo
echo "提示：若链接再次失效（shell 会话回收了后台进程），重跑本脚本即可。"
