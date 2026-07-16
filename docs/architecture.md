# forge 当前架构

forge 是面向豌豆思维课件制作的 Electron 桌面编辑器。React 负责编辑器界面和数据状态，LayaAir 与 `sdk_baiya` 负责课件组件渲染，Vite 开发服务器同时提供页面、资源代理和开发 API，Electron 负责用户电脑上的文件访问。

## 系统组成

```text
Electron 客户端（电脑 B）
├── 加载远程 Vite 页面
├── 本地课件目录与文件 IPC
├── 自定义模板目录
└── 发布产物写入
          │ HTTP / multipart
          ▼
Vite 开发服务器（电脑 A）
├── React 编辑器页面
├── /api/* 开发接口
├── preview-server 静态代理
├── 课件动态路由
└── 预览工程编译与上传
          │
          ▼
GameLoader + LayaAir + sdk_baiya
```

Vite 不是独立生产后端，`pnpm build` 只生成静态 SPA。forge 的常见运行方式是远程 Vite 配合 Electron 客户端，而不是把所有能力都放在同一台电脑。

## 主要入口

| 位置 | 职责 |
| --- | --- |
| `src/main.tsx` | React 启动入口 |
| `src/App.tsx` | 起始页、编辑器主布局、快捷键和本地自动保存 |
| `src/store/editorStore.ts` | 唯一全局课程状态、选中、剪贴板和 50 步历史 |
| `src/components/Canvas.tsx` | React 状态与 Laya 画布同步 |
| `src/utils/laya/core.ts` | Laya 启动、对象注册、预览模式和 sdk 运行上下文 |
| `src/elements/elementMeta.ts` | 组件类型、默认值、属性面板和导出元数据 |
| `src/utils/exportProject.ts` | 预览和发布课件工程的共享导出入口 |
| `vite.config.ts` | Vite 配置、静态代理、课件路由和 `/api/*` middleware |
| `electron/main.cjs` | Electron 窗口、远程服务器选择、本地文件和编译 IPC |
| `electron/preload.cjs` | 向渲染进程暴露受控 Electron API |

## 页面与状态模型

课程数据以 `Course` 为根，包含正常关卡、预习关卡、小关卡、内部页面、元素、动作和资源引用。

全局状态只存在于 `editorStore.ts`：

- 当前课程、关卡、小关卡和内部页面。
- 元素选择、复制粘贴、编组和画布变换。
- 页面缩略图、自定义模板和编辑历史。
- 页面、元素、动作和容器操作。

`App.tsx` 在课程状态变化后 15 秒写回 Electron 本机课程文件，并清理无引用图片；Ctrl+S 立即执行同一路径。localStorage 只保存少量界面偏好和旧兼容数据，不是课程状态的权威来源。

## 渲染模型

`index.html` 在 React 前同步加载 GameLoader 和 sdk_baiya，确保 `window.Laya` 与 `window.com.klzz.*` 在画布初始化时存在。

编辑模式和预览模式有意不同：

- 编辑模式使用占位组件规避 sdk 组件崩溃、自动播放和缩放动画干扰。
- 预览模式实例化真实 `layaType` 组件。
- React store 是数据源，Laya 对象负责画布显示和高频交互反馈。
- `elementMeta.ts` 同时驱动工具栏、属性面板、组件创建和导出，不应出现第二套组件定义。

## 远程文件边界

Electron 和 Vite 运行在不同电脑时，路径只对各自所在机器有意义。

- 课程根目录和 `outputDir` 属于 Electron 本机，不能发送给远程 Vite。
- 远程服务器需要的资源通过 HTTP 上传。
- Electron 本机副本通过 preload 暴露的 IPC 写入或复制。
- `forge-local://` 协议把课程 ID 映射到 Electron 本机目录，用于安全读取本地课程资源。
- 凭据、证书、本机课程和生成的预览内容都不进入 Git。

## 预览与导出

工具栏的预览和发布都进入 `exportProject.ts`，根据课程类型生成正课、作业、预习、专题测评或复习课工程。

主要过程：

1. 校验课程结构、动作目标和资源。
2. 编译内部页面和组件树。
3. 收集、去重并改写图片、音频、视频和骨骼资源。
4. 生成 Laya UI、脚本、配置、atlas 和版本映射。
5. 预览时上传编译结果并打开 GameLoader。
6. 发布时写入 Electron 本机课件目录，再进入项目既有提交链路。

详细过程见 [export-pipeline.md](./export-pipeline.md)。

## 模板与资源

项目存在两类模板：

- 内置预设：随代码维护，用于提供稳定的组合起点。
- 自定义模板：存放在用户选择的本地目录，按 MD5 去重并跨课程复用。

大型素材库 `public/builtin/library/` 默认不进入 Git。代码只维护资源使用规则和必要 runtime，素材版本需要由团队另行同步。新增 `public/builtin/runtime/game/` 文件后必须重新生成 `game.zip`。

## 验证体系

- `tests/` 使用 Node 测试执行器覆盖画布几何、选择交互、内部页面、模板/资源扫描和资源库检索等纯逻辑。
- `pnpm build` 同时执行 TypeScript 构建和 Vite 生产构建。
- Electron、本地文件、真实 Laya 渲染、预览和发布仍需要人工验收。
- `pnpm lint` 对 TypeScript、React Hooks 和项目规范执行全量静态检查。

验证范围见 [testing.md](./testing.md)。

## 已知边界与风险

- Vite 开发 API 没有独立生产服务边界，只应运行在受控开发网络。
- sdk_baiya 和 LayaAir 以全局脚本加载，初始化顺序是硬约束。
- 部分能力依赖未入库的素材库和本地课件环境，CI 无法覆盖真实资源完整性。
- Electron IPC、远程双机模式和最终 GameLoader 表现不能只用浏览器构建结果判断。
- lint、单元测试和静态构建可以在 CI 中覆盖代码层回归，但不能替代远程双机与真实课件验收。

## 相关文档

- [开发环境](./development.md)
- [命令清单](./commands.md)
- [测试与验收](./testing.md)
- [开发服务器](./dev-server.md)
- [导出流程](./export-pipeline.md)
- [Electron 打包](./electron-packaging.md)
- [自定义模板](./custom-templates.md)
- [版本管理](./versioning.md)
- [阶段迭代路线](./roadmap/editor-iteration-roadmap.md)
- [代码健康治理与渐进式重构路线](./roadmap/code-health-refactoring.md)
