# Electron 启动说明

## 问题原因

VSCode 内置终端会自动注入 `ELECTRON_RUN_AS_NODE=1` 环境变量（VSCode 本身是 Electron 应用，用这个变量让内置 Node 运行时以普通 Node 模式工作）。这导致 `pnpm electron:dev` 直接运行时，Electron 进程也以 Node 模式启动，`require('electron')` 拿不到内置 API，报 `app is undefined`。

## 启动方法

在 VSCode 的 PowerShell 终端里执行：

```powershell
.\start-electron.ps1
```

或者手动两行：

```powershell
$env:ELECTRON_RUN_AS_NODE = $null
pnpm electron:dev
```

> 注意：必须用 PowerShell，不能用 bash/cmd（bash 里 `cross-env` 无法覆盖该变量）。
