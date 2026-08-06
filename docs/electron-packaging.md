# Electron 打包（electron-builder）注意事项

## 常见问题排查

### 打包卡在 "searching for node modules"

**现象**：运行 `pnpm electron:build` 或 `.\build-electron.ps1` 时，输出停在：
```
• searching for node modules  pm=pnpm searchDir=D:\aiproject\forge
```
数十分钟无响应，最终超时失败。

**根本原因**：

electron-builder 26.8.1 使用 `pnpm list --prod --json --depth Infinity` 扫描生产依赖，构建依赖图。对于依赖树复杂的老包（如 `layaair2-cmd`，依赖 gulp 3.x + browserify），这个命令会生成**巨大的 JSON**（35MB+，62000+ 节点），然后 electron-builder 递归遍历每个节点调用 `locatePackageVersion`（文件系统查询），导致卡死。

**诊断方法**：
```bash
# 1. 手动跑 pnpm list 看输出大小和耗时
pnpm list --prod --json --depth Infinity > /tmp/deps.json
wc -c /tmp/deps.json  # 如果 >10MB 就可能有问题

# 2. 分析哪个包导致依赖爆炸
node -e "
const data = JSON.parse(require('fs').readFileSync('/tmp/deps.json', 'utf-8'));
function countSub(deps, depth = 0) {
  if (!deps || depth > 50) return 0;
  let n = 0;
  for (const k in deps) {
    n++;
    n += countSub(deps[k].dependencies, depth + 1);
  }
  return n;
}
const top = Object.entries(data[0].dependencies)
  .map(([k, v]) => [k, countSub({[k]: v})])
  .sort((a, b) => b[1] - a[1]);
console.log('顶层依赖展开后的节点数:');
for (const [k, n] of top.slice(0, 10)) console.log('  ' + k + ': ' + n);
"
```

**解决方案**：

将**不需要被 electron-builder 扫描的工具包**从 `dependencies` 移到 `devDependencies`。这些包通过 `extraResources` 提供给运行时，不是应用的生产依赖：

```json
{
  "dependencies": {
    "@tailwindcss/postcss": "^4.2.3",
    "jszip": "^3.10.1",
    "lucide-react": "^1.8.0",
    "react": "^19.2.5",
    "react-dom": "^19.2.5"
  },
  "devDependencies": {
    "electron": "41.4.0",
    "electron-builder": "^26.8.1",
    "esbuild": "^0.25.0",          // ← 移到这里
    "layaair2-cmd": "^1.6.15",    // ← 移到这里
    ...
  }
}
```

**原则**：只有**应用运行时直接 `require()` 的包**才放 `dependencies`，构建工具、Electron 自身、通过 IPC 调用的外部工具都应该在 `devDependencies`。

---

### 打包时提示 "ENOENT: no such file or directory, rename 'electron.exe'"

**现象**：
```
⨯ ENOENT: no such file or directory, rename 'D:\...\release\win-unpacked\electron.exe' -> 'D:\...\release\win-unpacked\wandouEditor.exe'
```

**根本原因**：

electron-builder 的 `app-builder.exe` 默认会尝试从网络（GitHub releases）下载 Electron，而不是使用本地 `node_modules/electron/dist/` 已安装的版本。网络失败或被拦截时，`release/win-unpacked/` 里就没有 `electron.exe`。

**解决方案**：

在 `package.json` 的 `build` 配置中显式指定 `electronDist`：

```json
{
  "build": {
    "appId": "com.vipthink.forge",
    "productName": "wandouEditor",
    "executableName": "wandouEditor",
    "electronDist": "node_modules/electron/dist",  // ← 添加这行
    ...
  }
}
```

这样 electron-builder 会直接拷贝本地的 electron 而不是下载。

---

## extraResources 配置说明

`compile-build` IPC 调用 `layaair2-cmd` 和 `esbuild` 编译 sdk_baiya 工程。打包后这两个工具必须通过 `extraResources` 提供，且路径**写死了 pnpm 版本号**——升级依赖时需同步更新 [package.json](../package.json) 的 `build.extraResources`：

```json
"node_modules/.pnpm/@esbuild+win32-x64@0.25.12/node_modules/@esbuild/win32-x64"
"node_modules/.pnpm/layaair2-cmd@1.6.15/node_modules"
```

- `node_modules/layaair2-cmd` 是 pnpm 符号链接，**不能直接** `from: "node_modules/layaair2-cmd"` 拷贝——会丢失 sibling 依赖（iconv-lite、xmldom、commander 等），导致 `Device.require('iconv-lite')` 失败、CMDShell 不能初始化、atlas/fileconfig 全部生不成。
- 正确做法是从 `.pnpm/layaair2-cmd@<version>/node_modules` 整个目录拷到 `node_modules`，把 layaair2-cmd 和它的 siblings 一起放进去
- **传递依赖（transitive deps）也要单独拷贝**：pnpm 把 `iconv-lite` 的依赖 `safer-buffer` 放在 `.pnpm/iconv-lite@<ver>/node_modules/safer-buffer/`，不在 layaair2-cmd 同级 siblings 里。dev 模式和 win-unpacked 能用是因为 Node 模块查找会向上遍历到项目根 `node_modules/`，**NSIS 安装版没有项目 node_modules，会暴露这类隐藏依赖缺失**——`safer-buffer` 必须显式加到 `extraResources`（`from: "node_modules/.pnpm/iconv-lite@0.5.2/node_modules/safer-buffer"`），未来加新工具或升级版本时要查一遍传递依赖
- esbuild 二进制 `@esbuild/win32-x64/esbuild.exe` 也在 pnpm 虚拟目录里，同样要从 `.pnpm/...` 拷贝
- 打包后 `process.execPath` 是 `wandouEditor.exe`（产品名 productName 必须用 ASCII，否则路径含中文导致 layaair2-cmd 内部 `child_process.fork()` 子进程失败；中文名通过 `nsis.shortcutName` 显示）。在 `compile-build` 中通过 `child_process.execFile` 调 `LayaAirCmdTool.max.js` 时**必须** `env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }`，否则会拉起新的 Electron GUI 进程
- `LayaAirCmdTool.max.js` 内部 `console.log("All Work complete")` 后还有 `exportFileConfig` 等异步 fork 在写文件，**不能立即 kill**——`compile-build` 检测到 "All Work complete" 后**轮询 `bin/fileconfig.json` 大小稳定**（每 500ms 检查一次，连续 2 次大小不变即认为写完）再 kill；30 秒兜底超时。固定 sleep 时间在慢路径（如 NSIS 安装到 Program Files、被 Defender 扫描）下不够用
- jszip 不要 `require('jszip')`——pnpm 下 jszip 的依赖（lie/pako/readable-stream/setimmediate）在虚拟目录里，extraResources 拷不全。直接 require `electron/vendor/jszip.bundle.cjs`（用 `npx esbuild --bundle --platform=node` 预打的自包含 CJS）
- **诊断打包后行为差异的方法**：在 `compile-build` 里写日志到 `os.tmpdir()/forge_layaair_*.log`，记录 `process.execPath`、tool 路径、子进程 stdout/stderr、产物文件大小。`win-unpacked` 能跑 ≠ NSIS 安装版能跑，前者会向上找到项目 `node_modules`，后者完全独立

### 内置 SVN CLI

课件发布的本地工作副本检查不能依赖老师电脑的 `PATH` 或 TortoiseSVN 是否额外安装命令行组件。Windows 安装包通过 `extraResources` 携带经过版本和哈希锁定的 Apache Subversion Windows 命令行发行包：

- 当前版本为 VisualSVN 提供的 Apache Subversion 1.14.5-4，可再分发原包 SHA-256 为 `1801dc76910bf196948eaf4b4a9a8e0178e39da6a5339c11413b5e6dcb32e39d`，来源记录见 `electron/vendor/svn-cli/windows-x64/SOURCE.md`。
- 主进程只调用 `process.resourcesPath/svn-cli/bin/svn.exe`，不调用裸命令 `svn`；该 CLI 只允许执行本地 `info/status/add/delete/revert`，不得用于远程地址探测、update 或 commit。
- 必须连同发行包中的依赖 DLL、许可证和来源说明一起分发，不能只复制 `svn.exe`。
- 开发模式没有内置目录时允许使用 `FORGE_SVN_BINARY` 指定测试路径，或回退到系统 `svn`；正式打包模式缺少内置文件时应明确报告客户端组件损坏。
- 升级 CLI 时必须同步版本、下载来源、SHA-256、许可证文件和真实 Windows 安装包验收记录。

### TortoiseSVN 提交

公司 SVN 使用 SASL，内置 VisualSVN CLI 不能替代公司现有客户端完成远程认证。正式提交通过 `TortoiseProc.exe /command:commit` 打开老师熟悉的确认窗口：

- 定位顺序为 `FORGE_TORTOISE_PROC`（开发与测试注入）、系统 `PATH`、TortoiseSVN 注册表安装目录和标准安装路径。
- Windows 正式包找不到 `TortoiseProc.exe` 时阻止发布，不回退到内置 CLI commit。
- 同步发布向 TortoiseSVN 传入课件目录范围；课件源目录与最终目录相同时，原地发布只传入 `forge-publish.json` 和受管 `Game1_*`，不得让源课件修改混入提交窗口。
- TortoiseSVN 关闭后必须再次用内置 CLI 检查本次受管发布范围；仍有修改、取消或提交失败均不通知打包机。原地发布中的课件 JSON、`images/`、`project/` 等源文件状态不参与该判断。
- 只有本地状态干净，并能从身份文件与各工程目录读取实际 revision、URL 时，才把这些真实结果交给现有 `integrationRequest`。
- 自动测试可以注入假的提交执行器；真实 Windows 验收必须使用公司 TortoiseSVN、公司 SASL 账号和实际网络完成。

### Forge MCP 与 Agent 适配产物

MCP 随客户端版本交付，并由已安装的 `wandouEditor` 可执行文件以 stdio 模式启动；老师电脑不应额外安装 Node.js。MCP 运行依赖必须预打包为自包含 CJS 放入 `electron/vendor/`，不能依赖 NSIS 安装目录之外的项目 `node_modules`。

中立 Skill 和 Codex、Claude Code、OpenCode、WorkBuddy 配置片段作为只读 `extraResources` 进入安装包。安装配置只能写老师明确选择的 Agent 配置，不覆盖未知字段或已有服务器。打包验证必须检查 MCP bundle、Skill 根 `SKILL.md`、四端适配文件和许可证；Windows 真机还要实际从至少一个 Agent 启动可见编辑器并完成 Manifest 调用。详细契约见 [Agent 作业草稿制作与 Forge MCP](./ai-authoring.md)。
