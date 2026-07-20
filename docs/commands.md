# 命令清单

forge 固定使用 package.json 声明的 pnpm 10，不使用 npm 或 yarn。

## 安装与开发

```bash
pnpm install --frozen-lockfile  # 按 lockfile 安装依赖
pnpm dev                        # Vite 开发服务器，监听 0.0.0.0:6688
pnpm electron:dev               # 启动 Electron 客户端
pnpm electron:start             # 同 electron:dev
```

## 检查

```bash
pnpm test     # 编译并运行 tests/*.test.ts
pnpm build    # tsc -b && vite build
pnpm lint     # ESLint 全量检查
pnpm preview  # 预览 vite build 静态产物，不包含开发 API
```

PR 的必需自动检查是 `pnpm lint`、`pnpm test` 和 `pnpm build`。详细要求见 [testing.md](./testing.md)。

## 资源打包

```bash
pnpm pack-game
```

`public/builtin/runtime/game/` 新增或修改文件后必须运行该命令，更新 `public/builtin/runtime/game.zip`，否则导出的课件找不到新资源。

## Electron 打包

```bash
pnpm electron:build
```

安装包输出到 `release/<version>/`。普通开发和 PR 验证不执行最终打包；版本发布前由项目负责人按 [electron-packaging.md](./electron-packaging.md) 验证。

当前环境不是 Windows 时，可从 GitHub Actions 手动运行“Windows 安装包”工作流并输入目标 Tag。工作流会在 Windows runner 上执行 `pnpm exec electron-builder --win --x64`，输出安装包、SHA-256 和可下载构建产物；最终仍需在已验证的 Windows 电脑完成实际安装验收。

安装包生成后的 Tag、GitHub Release、公司台式机部署、老师端交付和回退步骤见 [正式发板与内部部署](./internal-deployment.md)。

## 相关文档

- [开发环境](./development.md)
- [测试与验收](./testing.md)
- [开发服务器](./dev-server.md)
- [导出流程](./export-pipeline.md)
- [版本管理](./versioning.md)
