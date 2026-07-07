# 版本号规则

forge 编辑器版本号写在 `package.json` 的 `version` 字段，遵循语义化版本（SemVer）。

## 版本号含义

- `1.0.0` - 首个正式版
- `1.1.0` - 加新功能（向后兼容）
- `1.1.1` - 修 bug（向后兼容）
- `2.0.0` - 破坏性改动（不向后兼容）

## 版本号的三处同步点

修改 `package.json` 的 `version` 字段后，以下三处自动同步：

1. **编辑器左上角显示**：运行时读取 vite 注入的 `__APP_VERSION__` 常量
2. **electron 安装包文件名和输出目录**：`豌豆课件编辑器 Setup ${version}.exe`，输出到 `release/${version}/` 子目录
3. **课件目录下 `editor-version.txt`**：发布工程时写到课件根目录（与 `course.json` 同级），记录该课件用哪个版本编辑器制作

## 发版流程

1. 手动改 `package.json` 的 `version` 字段
2. 跑 `pnpm electron:build`，产物落到 `release/<version>/`（旧版本目录不动）
3. 需要清理旧版本时手动删 `release/<旧版本>/`

## 课件 editor-version.txt

每次点"发布工程"时，会在课件目录根（如 `D:\project\v1\test\L12_v1_test_14\editor-version.txt`）
写入一份版本记录，**覆盖**旧的。所有课件类型（正课/作业/预习/专题测评/复习课）都从同一个入口
`exportProject()` 走，无需在每个工程子目录重复写。

内容示例：

```
编辑器版本: 1.0.0
发布时间: 2026-06-26 16:45:12
课件ID: L12_v1_test_14
课件类型: normal
```
