# VSCode / Claude Code 终端启动 Electron 的专用脚本
# 这些终端会注入 ELECTRON_RUN_AS_NODE=1，必须彻底删除（设为 0 无效）

Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

# 不填地址 → 自动连 http://localhost:6688，填了地址 → 连指定地址
pnpm electron:dev @args