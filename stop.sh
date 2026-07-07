#!/bin/bash
cd "$(dirname "$0")"

# 停编辑器
if [ -f .pid ]; then
  PID=$(cat .pid)
  kill "$PID" 2>/dev/null && echo "编辑器已停止 (pid $PID)" || echo "编辑器进程 $PID 未找到"
  rm -f .pid
fi

# 停同步服务器
if [ -f .socket-pid ]; then
  PID=$(cat .socket-pid)
  kill "$PID" 2>/dev/null && echo "同步服务器已停止 (pid $PID)" || echo "同步进程 $PID 未找到"
  rm -f .socket-pid
fi

# 清理残留进程
REMAINING=$(ps aux | grep -E '[n]ode.*forge.*vite|[j]ava.*teachingService' | awk '{print $2}')
if [ -n "$REMAINING" ]; then
  echo "$REMAINING" | xargs kill 2>/dev/null
  echo "清理残留进程"
fi

# Windows 兜底
if command -v taskkill >/dev/null 2>&1; then
  for PORT in 6688 9001; do
    PIDS=$(netstat -ano 2>/dev/null | awk -v p=":$PORT" '$2 ~ p && $4 == "LISTENING" {print $5}' | sort -u)
    for P in $PIDS; do
      taskkill //PID "$P" //F >/dev/null 2>&1 && echo "端口 $PORT 残留 (Windows pid $P) 已强制终止"
    done
  done
fi