# forge 编辑器里程碑记录

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 更新日期：2026-04-24

---

## 已完成的里程碑

### M1: 核心闭环验证 ✅
- 编辑器用 Kl* 组件编辑课件
- 导出 finalConfig.json + LessonZK.js（真实课件结构：__extends + createChildren + createView）
- GameLoader 完整运行环境搭建（preview-server + 真实 sys_config）
- 真实课件 s9_v8_89_LessonZK 可预览
- 编辑器导出的课件在 GameLoader 中运行

### M2: 全量组件接入 ✅
- 9 个分类 Tab，约 40 个 sdk_baiya 组件
- Klzz.__init__ 空壳初始化（通过 window.com.klzz.Klzz 获取）
- VipThink mock（GlobalModel.user + ViewManager._instance + VipThink._config）
- 组件 sync/事件禁用（编辑器模式）
- comp.atlas 皮肤加载

### M3: 属性系统 ✅
- Element.props 动态属性字典
- elementMeta 每个组件定义 properties + group 分组
- 属性面板从 elementMeta 动态渲染（文本/外观/交互/状态/自定义皮肤）
- FieldRenderer 支持 8 种字段类型（number/text/textarea/color/select/slider/boolean/file）
- 父容器下拉选择

### M4: 资源管理 ✅
- /api/upload 文件上传接口（multipart 解析，MD5 去重，格式/大小校验）
- FieldRenderer 文件上传 + 缩略图预览 + 清除按钮
- 导出时资源扫描/改写路径/复制文件
- data:image skin 导出为文件（base64 解码）
- 按页生成 config.json res 列表
- /uploads/ 路径 → game/image/ 路径改写

### M5: 皮肤体系 ✅
- skinGenerator: Canvas API 生成 9 种组件默认皮肤（Button/CheckBox/Radio/TextInput/ProgressBar/Tab/VSlider）
- 皮肤编辑器弹窗：支持全部 9 种组件，颜色/圆角/边框 + 6 种预设 + 实时预览
- 属性面板 _bgColor/_hoverColor/_pressColor 等字段自动生成皮肤
- 上传 PNG 优先于自动生成
- 导出时 _ 前缀字段不导出

### M6: Action 系统 ✅
- 7 种事件：onClick/onLoad/onChange/onDrop/onAllRight/onWrong/onComplete
- 8 种动作：toggleVisible/setVisible/setProperty/changePage/playSound/stopSound/resetPage/animate
- setProperty 从目标组件属性列表选择
- 导出生成正确的 JS 事件绑定代码（VipThink.viewMgr.setCurrPageIdx / Laya.SoundManager 等）

### M7: 编辑体验（基础能力已存在，画布真实交互待重构验收）
- 复制/粘贴（Ctrl+C/V/D）+ ID 映射更新（targetId/parentId）
- 全选（Ctrl+A）
- 方向键微调（1px / Shift+10px）
- 对齐（6 种）+ 等间距分布（2 种）+ 画布实时同步
- 编组/取消编组（Ctrl+G / Ctrl+Shift+G）
- 多选拖动已接通真实指针手势，可从任意已选成员发起整体移动
- 多选蓝色边框视觉反馈
- 网格覆盖层（20px 细线 + 100px 粗线）+ 网格吸附
- 标尺（水平 + 垂直，百分比定位）
- Ctrl+S 保存
- 元素列表支持修饰键多选；画布多选、首次拖动和统一命中已完成第一批重构，多选缩放旋转等能力待后续实施

后续实施与验收以 [画布与图层基础交互整体优化设计](./roadmap/canvas-layer-interaction-design.md) 为准，不再把存在数据分支等同于真实用户能力完成。

2026-07-15 第一批基础交互已完成：统一 Pointer Events 命中与拖动链路、首次手势直接拖动、多选整体移动、父子选择规范化、旋转感知命中、完全包含框选和无变化不记历史已通过自动检查与 Electron 真实画布验收。多选缩放旋转、智能吸附、拖动复制和完整图层面板仍待后续批次。

### M8: Store ↔ Canvas 统一同步 ✅
- React 驱动，Laya 跟随（Store 只管数据，Canvas.tsx 统一同步）
- 统一 effect 处理增删改 + z-order（prevElementsRef diff 检测）
- 拖动时直接更新 Laya 对象（高频优化，不等 React effect）
- 删除父容器递归清理子元素
- parentId 变更时自动重新挂载

### M9: 元素嵌套 ✅
- Element.parentId 字段
- 属性面板父容器下拉选择（只列出容器类组件）
- 画布渲染：子元素 addChild 到父容器
- parentId 变更时自动从旧父容器移除，挂载到新父容器
- 导出时递归生成嵌套 uiView child
- 元素列表层级缩进

### M10: 第四期 — atlas 打包 + hash 版本控制 ✅
- atlasPacker.ts: Canvas API shelf packing 算法
- 图片按目录分组，每组打一个 atlas（sprite sheet）
- 生成 Laya 兼容的 atlas JSON（frames + meta）
- 生成 fileconfig.json（atlas → 图片映射）
- SHA-256 前 8 位作为文件 hash
- 生成 version.json（原始路径 → hash 路径映射）
- 资源文件用 hash 文件名保存
- config.json res 列表同时引用 atlas 和单张图片

### M11: 代码清理 + 稳定性审计 ✅
- 删除 propertyFields.ts（被 elementMeta.properties 替代）
- 删除 applyProps 函数（旧 12 类型渲染，100+ 行死代码）
- z-order 同步修复（setChildIndex 用正确索引）
- 导出变量名安全（数字开头加下划线）
- action targetId 用元素 name 查找
- 多处 null check 补全
- 数字输入修复（允许清空再输入）

### M12: 同步预览模式 ✅
- 同步服务器（socket_baiya teachingService.jar）自动启动
- 工具栏三个角色按钮：教师(type=1) / 学生(type=2) / 观察者(type=3)
- 连接同一房间（roomid=forge01），通过 WebSocket 同步
- preview-server index.html 对齐 GameLoaderProd 原始格式
- publishOnly() 只发布不打开窗口，教师按钮先发布再打开
- 皮肤预览裂图修复（share/comp/ 路径不显示缩略图）
- 皮肤编辑器应用修复（一次性合并所有 props 变更）

---

## 未完成 / 后续计划

### 第五期：高级功能（标记，非重点）
- [ ] 皮肤主题（预设主题一键换肤）
- [ ] 模板系统（封面页/讲题页/练习页模板）
- [ ] 资源库（共享资源浏览器 + 拖拽创建）
- [ ] 协作与版本（Git 集成 / WebSocket 同步）

### 体验优化（待定）
- [ ] 容器类/交互类组件外观编辑
- [ ] 右键菜单
- [ ] 智能参考线（拖动对齐辅助线）
- [ ] 元素列表拖拽排序
- [ ] 标尺缩放适配

### 待验证
- [ ] sdk_baiya 同步（ISyncComp.sync）是否正常
- [ ] 录制（RecordManager）是否能记录操作
- [ ] 回放（PlaybackController）是否能重放

---

## 技术文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 架构方案 | docs/architecture.md | 整体架构、输出格式、重构路径 |
| sdk_baiya 组件 | docs/sdk-baiya-components.md | 50 个组件的属性/方法/事件 |
| GameLoader | docs/gameloader.md | 13 步启动流程、finalConfig 格式 |
| 同步机制 | docs/sync-mechanism.md | ISyncComp、xpath、TransManager |
| 视图架构 | docs/view-architecture.md | ViewManager/MainView/PageView |
| 资源管理 | docs/resource-management.md | 资源体系、打包方案、皮肤规范 |
| 里程碑 | docs/milestones.md | 本文档 |

## 代码结构

```
src/
├── components/
│   ├── Canvas.tsx          — 画布 + 统一同步 effect
│   ├── PropertyPanel.tsx   — 属性面板（元素列表 + 属性编辑）
│   ├── FieldRenderer.tsx   — 字段渲染器（8 种类型）
│   ├── ActionEditor.tsx    — 事件动作编辑器
│   ├── ElementToolbar.tsx  — 组件工具栏（9 分类 Tab）
│   ├── SkinEditor.tsx      — 皮肤编辑器弹窗
│   ├── EditorPreview.tsx   — 编辑器内预览
│   ├── PageList.tsx        — 页面列表
│   ├── Toolbar.tsx         — 顶部工具栏
│   ├── FileMenu.tsx        — 文件菜单
│   └── ...
├── elements/
│   └── elementMeta.ts      — 40+ 组件定义（layaType/properties/defaultProps）
├── store/
│   └── editorStore.ts      — Zustand + Immer 状态管理
├── types/
│   └── index.ts            — Element/Page/Course/Action 类型
├── utils/
│   ├── layaBridge.ts       — re-export 入口
│   ├── laya/
│   │   ├── core.ts         — Laya 访问 + 对象注册 + preloadAtlas + VipThink mock
│   │   ├── components.ts   — 组件创建 + applyKlProps + 皮肤生成
│   │   ├── selection.ts    — 选择框 + 拖拽 + 框选 + 多选边框
│   │   └── preview.ts      — 预览模式
│   ├── export.ts           — 序列化导出 + atlas + hash + 发布
│   ├── skinGenerator.ts    — Canvas API 皮肤生成器
│   ├── atlasPacker.ts      — Canvas API atlas 打包器
│   └── storage.ts          — localStorage 持久化
└── ...
```
