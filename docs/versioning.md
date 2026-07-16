# 版本管理与发布

forge 使用语义化版本（SemVer），版本号以 `package.json` 的 `version` 为唯一来源。

## 版本含义

| 变化 | 版本 | 示例 |
| --- | --- | --- |
| 向后兼容的缺陷修复 | PATCH | `1.1.0` → `1.1.1` |
| 向后兼容的新能力 | MINOR | `1.1.0` → `1.2.0` |
| 不兼容的数据、工程或使用方式变化 | MAJOR | `1.1.0` → `2.0.0` |

版本选择依据实际用户影响，不根据提交数量、开发周期或 Issue 数量决定。

## 何时升级版本

- 普通功能、修复和文档 PR 不单独修改版本号。
- 准备向使用者交付一组已完成变化时，创建版本 Issue。
- 从最新 `main` 创建 `release/<version>` 分支和发布 PR。
- 发布 PR 统一修改版本号、回归记录和发布说明。

这样可以避免并行开发分支频繁冲突 `package.json`。

## 自动同步位置

修改 `package.json` 后，版本会用于：

1. 编辑器左上角显示：Vite 注入 `__APP_VERSION__`。
2. Electron 安装包名称和 `release/<version>/` 输出目录。
3. 发布课件根目录的 `editor-version.txt`。

不要在 README、组件或脚本中再维护第二个可执行版本来源。README 的展示版本应在发布 PR 中同步更新。

## 发布流程

1. 创建版本 Issue，列出纳入的 PR、目标版本、回归范围和已知风险。
2. 创建 `release/<version>` 分支与发布 PR。
3. 更新 `package.json` 版本和 README 展示版本。
4. 执行 `pnpm test`、`pnpm build` 和版本相关人工回归。
5. 执行 `pnpm electron:build`，检查安装包启动、服务器连接和关键 IPC。
6. 由评审者确认版本内容、已知限制和回退方式。
7. Squash 合并发布 PR。
8. 在合并提交创建带注释 Tag：`v<version>`。
9. 创建 GitHub Release，按用户可感知变化编写发布说明并关联 Issue/PR。
10. 由项目负责人执行最终分发或生产发布。

示例：

```bash
git tag -a v1.2.0 -m "发布 1.2.0"
git push origin v1.2.0
```

Tag 和 GitHub Release 只能在发布 PR 合并、回归完成后创建。

## `editor-version.txt`

每次发布工程时，编辑器会在课程根目录写入并覆盖 `editor-version.txt`。所有课程类型从 `exportProject()` 进入，不需要在各工程子目录重复维护。

内容包含：

```text
编辑器版本: 1.2.0
发布时间: 2026-07-16 16:45:12
课件ID: L12_v1_test_14
课件类型: normal
```

该文件用于追踪课件由哪个编辑器版本生成，不代替 Git Tag 或 GitHub Release。
