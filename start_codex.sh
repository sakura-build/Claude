#!/bin/bash
# 启动 Moon Bridge（后台） + Codex（前台）
export PATH="/c/Program Files/Go/bin:$PATH"

echo "=== 启动 Moon Bridge ==="
/tmp/mb.exe --config "$HOME/moon-bridge/config.yml" &
MB_PID=$!
sleep 1

# 验证 Moon Bridge 是否启动成功
if curl -s http://127.0.0.1:38440/v1/models > /dev/null 2>&1; then
    echo "Moon Bridge 已启动 (PID: $MB_PID)"
else
    echo "等待 Moon Bridge 启动中..."
    sleep 2
fi

echo "=== 启动 Codex ==="
cd /c/Users/Huawei/Desktop/备份/Claude
exec codex
