# Forge 验证地图

本文把“代码有测试”“能在 Electron 中运行”“已经在公司环境交付”分开记录。测试状态以当前代码和测试输出为准，不能用构建成功替代真实体验。

## 已有自动覆盖

| 用例 | 规则与否定场景 | 证据 | 状态 |
| --- | --- | --- | --- |
| 画布选择、拖动、缩放、旋转、吸附和历史 | 父子、锁定、隐藏、旋转和无变化操作不产生错误选择或多余历史 | `tests/canvas-*.test.ts`、`tests/selection-set.test.ts`、`tests/layer-*.test.ts` | existing |
| 内部页面与弹窗 | 页面/分组/入口/底板/遮罩关系保持，失效目标阻止发布 | `tests/internal-pages*.test.ts` | existing |
| 课程另存与路径安全 | 同路径、双向嵌套、符号链接越界、普通非空目录和中断恢复必须拒绝或可恢复 | `tests/course-save-as.test.ts`、`tests/server-path-safety.test.ts`、`tests/course-path-display.test.ts` | existing |
| 导出结构与资源 | 正课、作业、专题测评、预习、复习和内部页面生成正确场景、配置和资源边界 | `tests/export-regression.test.ts`、`tests/course-packaging.test.ts` | existing |
| 输入、键盘、选择和判定 | 候选答案、算式关系、空/错/对、主题资源和答案引用保持一致 | `tests/math-input.test.ts`、`tests/issue72.test.ts`、`tests/issue74.test.ts`、`tests/issue76.test.ts`、`tests/sdk-judge.test.ts` | existing |
| 预览路由与启动 | 课程后缀、预习回退、缓存参数和首屏启动状态正确 | `tests/preview-course-route.test.ts`、`tests/preview-loading.test.ts` | existing |
| 资源库 | 搜索、目录聚合、标签、系列识别和路径安全 | `tests/library-search.test.ts`、`tests/library-quick-tags.test.ts` | existing |
| 老师发布流程 | 指纹、确认失效、SVN 本地映射、提交范围、取消、revision 和通知状态 | `tests/course-publishing.test.ts`、`tests/course-publish-electron.test.ts` | existing |
| 静态合并门禁 | 类型、lint、单元测试和前端构建 | `.github/workflows/verify.yml`：`pnpm lint`、`pnpm test`、`pnpm build` | existing |

## 需要新负责人补做的测试

| 用例 | 测试类型 | 预期 |
| --- | --- | --- |
| v1.5.1 Windows NSIS 首次安装、覆盖安装、卸载和重启 | guarded live / manual review | 安装包、Electron 主进程、服务器地址和发布 IPC 版本一致 |
| 电脑 A Vite + 电脑 B Electron 的 HTTP 局域网流程 | guarded live | 保存、资源、内容摘要、预览和发布入口在非 localhost 环境可用 |
| 公司 SVN/TortoiseSVN 首次发布、更新、删除预习、取消、冲突、权限失败 | manual review | 真实 SASL 登录和受管范围符合 `docs/course-publishing.md` |
| 打包机请求成功、明确失败、无最终反馈和客户端重启重试 | guarded live | 不重复 SVN commit，状态能区分已提交与全部完成 |
| 当前素材库快照与代表性真实课程 | manual review | 预设、输入框、键盘、Spine、视频和外部图片在导出/预览中真实可见 |
| #161 合并 v1.5.1 后的 Agent 作业 POC | automated integration + manual review | MCP 能力修订、事务、六题、截图、GameLoader 和老师审核边界不回归 |
| 发布配置默认值与部署 `.env` 的一致性 | automated integration | `/api/publish-config` 不把错误的课型基础地址带给老师 |

## 当前缺口

- CI 不运行 Electron、Windows、LayaAir 编译器、真实 GameLoader、公司 SVN、TortoiseSVN 或打包机。
- 导出结构测试不覆盖真实写盘、模板 ZIP 下载、文本 Canvas 烘焙、Spine 伴随音频和所有外置素材版本。
- 资源库默认不入 Git，缺少可由 CI 独立复现的完整素材快照验收。
- Vite API 无认证、无独立服务守护和公网防护测试。
- v1.5.1 发布记录中的 Windows 安装、局域网、公司台式机和老师分发仍需现场证据。
- `docs/review.md` 的“全部流程完成”和旧性能数字不是当前测试证据，不能作为通过依据。

## 合并与发布门禁

普通 PR 至少运行 `pnpm lint`、`pnpm test`、`pnpm build`。涉及画布、Electron、文件、预览、导出或发布时，PR 还必须记录真实入口、操作路径、结果和未覆盖环境。版本发布还要执行 `pnpm electron:build`、Windows 安装和局域网真实验收；最终发布由负责人执行。
