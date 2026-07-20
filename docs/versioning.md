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
- 发布 PR 统一修改版本号，并在 `docs/releases/v<version>.md` 记录发布说明、回归结果、待完成验收和已知限制。

`release/<version>` 是普通 `<type>/<issue-number>-<short-name>` 分支命名的唯一例外，但仍然保持一个版本 Issue 对应一个发布 PR，并在合并后清理。这样可以避免并行开发分支频繁冲突 `package.json`。

## 自动同步位置

修改 `package.json` 后，版本会用于：

1. 编辑器左上角显示：Vite 注入 `__APP_VERSION__`。
2. Electron 安装包名称和 `release/<version>/` 输出目录。
3. 发布课件根目录的 `editor-version.txt`。

不要在 README、组件或脚本中再维护第二个可执行版本来源。README 的展示版本应在发布 PR 中同步更新。

## 发布流程

1. 创建版本 Issue，列出纳入的 PR、目标版本、回归范围和已知风险。
2. 创建 `release/<version>` 分支与发布 PR。
3. 更新 `package.json` 版本、README 展示版本和 `docs/releases/v<version>.md` 发布记录。
4. 执行 `pnpm test`、`pnpm build` 和版本相关人工回归。
5. 执行 `pnpm electron:build`，检查安装包启动、服务器连接和关键 IPC。
6. 由评审者确认版本内容、已知限制和回退方式。
7. Squash 合并发布 PR。
8. 在合并提交创建带注释 Tag：`v<version>`。
9. 创建 GitHub Release，按用户可感知变化编写发布说明并关联 Issue/PR。
10. 由项目负责人执行最终分发或生产发布。

从安装包上传、公司台式机部署到老师端交付、更新和回退的操作规则见 [正式发板与内部部署](./internal-deployment.md)。部署机只能运行已发布 Release 对应的 Tag，不得直接跟随 `main`。

示例：

```bash
git tag -a v1.2.0 -m "发布 1.2.0"
git push origin v1.2.0
```

Tag 和 GitHub Release 只能在发布 PR 合并、回归完成后创建。

## GitHub Release 内容

GitHub 会根据 Tag 自动提供 Source code ZIP 和 TAR.GZ，不需要再次手动上传源码。每个正式 Release 还必须包含：

- 与版本号一致、在 Windows 真实安装验证过的 Electron 安装包。
- 安装包 SHA-256 校验值。
- 面向老师的用户可感知变化和已知限制。
- 公司服务器是否需要更新、美术资源是否变化。
- 老师端是否必须重新安装；无法确认兼容时默认需要升级。
- 上一可用版本和回退说明。
- 关联版本 Issue 与发布 PR。

源码、安装包、美术资源和运行数据的边界以 [正式发板与内部部署](./internal-deployment.md) 为准。

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
