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
