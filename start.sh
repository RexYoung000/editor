#!/bin/bash
cd "$(dirname "$0")"

# ========== 启动流程 ==========
echo "=== Forge 启动 ==="

# 1. 停掉旧进程
./stop.sh 2>/dev/null

# 2. 启动编辑器 (端口 6688，含预览服务)
pnpm dev &
EDITOR_PID=$!
echo $EDITOR_PID > .pid
echo "编辑器+预览启动: http://localhost:6688 (pid $EDITOR_PID)"

# 3. 启动同步服务器 (端口 9001)
( cd socket_baiya && exec java -jar teachingService.jar ) &
SOCKET_PID=$!
echo $SOCKET_PID > .socket-pid
echo "同步服务器启动: localhost:9001 (pid $SOCKET_PID)"

echo ""
echo "=== 全部就绪 ==="
echo "编辑器: http://localhost:6688"
echo "预览真实课件: http://localhost:6688/preview-server/?course=s9_v8_89&type=1&ct=1&rl=dev"
echo "预览(教师): http://localhost:6688/preview-server/?course=test_forge&type=1&ip=127.0.0.1&port=9001&roomid=forge01&id=teacher&ct=1&rl=dev"
echo "预览(学生): http://localhost:6688/preview-server/?course=test_forge&type=2&ip=127.0.0.1&port=9001&roomid=forge01&id=student&ct=1&rl=dev"
echo ""
echo "停止: ./stop.sh"