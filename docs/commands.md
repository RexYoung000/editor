# 命令清单

forge 项目可用的所有 pnpm 命令。包管理只用 **pnpm 10**（见 `package.json` 的 `packageManager`），不要用 npm。

## 开发

```bash
pnpm dev              # vite 开发服务器，监听 :6688（host 0.0.0.0），上传/发布 API 也挂在这里
pnpm build            # tsc -b && vite build（实际部署走 Electron，几乎不用）
pnpm lint             # eslint .
pnpm preview          # 预览 vite build 产物
```

没有测试套件。

## 资源打包

```bash
pnpm pack-game        # 重打 public/builtin/runtime/game.zip（runtime/game/ 加图后必须跑）
```

`public/builtin/runtime/game/` 是发布到课件包里的 runtime 资源目录，新增图片后必须重新打包 game.zip，否则导出的课件找不到新资源。等价的 PowerShell 命令：

```powershell
Compress-Archive -Path "public/builtin/runtime/game/*" -DestinationPath "public/builtin/runtime/game.zip" -Force
```

## Electron

```bash
pnpm electron:dev     # 跑 Electron（本地调试）
pnpm electron:start   # 同上
pnpm electron:build   # electron-builder 打包安装包，输出到 release/${version}/
```

打包细节（pnpm 符号链接 / 传递依赖 / `ELECTRON_RUN_AS_NODE` 等坑）见 [electron-packaging.md](electron-packaging.md)。

## 相关文档

- 开发服务器即后端（dev middleware + API）：[dev-server.md](dev-server.md)
- 发布/导出流程：[export-pipeline.md](export-pipeline.md)
- Electron 打包细节：[electron-packaging.md](electron-packaging.md)
- 自定义模板：[custom-templates.md](custom-templates.md)
- 发版规则与版本号同步：[versioning.md](versioning.md)
