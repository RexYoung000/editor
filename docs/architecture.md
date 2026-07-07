# Forge 编辑器架构方案

> 作者：Wills.Deng【微信：43592330】  
> 第二作者：AI 助手 Kiro  
> 基于 `pageshare-laya-research/optimal-solution-modern-frontend-sdk.md`  
> 更新日期：2026-04-23

---

## 核心思路

**现代前端 UI 层 + sdk_baiya.js 组件库 + LayaAir 引擎渲染**

```
┌─────────────────────────────────────────────────────┐
│  编辑器 UI 层 (TypeScript + React + Vite)           │
│  工具栏 / 属性面板 / 图层面板 / 页面缩略图           │
└─────────────────┬───────────────────────────────────┘
                  │ 调用
                  ↓
┌─────────────────────────────────────────────────────┐
│  sdk_baiya_base.js (2.5MB)                          │
│  50 个注册组件（KlLabel / ScaleButton / DragView…） │
│  ISyncComp 同步接口                                  │
│  完整 LayaAir 运行时                                 │
└─────────────────┬───────────────────────────────────┘
                  │ 渲染
                  ↓
┌─────────────────────────────────────────────────────┐
│  LayaAir 引擎 (Canvas/WebGL)                        │
└─────────────────────────────────────────────────────┘
```

---

## 为什么这样做

- **不需要转换器**：sdk_baiya 组件自带序列化，输出即 GameLoader 可读格式
- **不需要重写组件**：直接复用已验证的 50 个组件
- **APP 端零改动**：iPad / PC / Android 继续用现有 GameLoader 加载
- **现代开发体验**：TypeScript + React + Vite，前端生态完整

---

## 输出格式

编辑器导出的课件包结构：

```
LessonXXX/
├── finalConfig.json      # 页面配置（GameLoader 入口）
├── version.json          # 资源版本（MD5 hash）
├── view/
│   ├── game/Page0.js     # 每页的薄包装（加载 UI JSON）
│   └── game/Page1.js
├── ui/
│   ├── Page0.json        # Laya UI JSON（组件树）
│   └── Page1.json
└── res/                  # 图片 / 音频 / 视频资源
```

### finalConfig.json 格式

```json
{
  "isFinalConfig": true,
  "autoRunMain": true,
  "pages": [
    {
      "name": "page0",
      "subviews": [{ "view": "view/game/Page0.js", "classType": "lt" }]
    },
    {
      "type": "video",
      "classType": "gc",
      "param": { "isv5": 1, "isAutoPlay": 1, "vName": "xxx" }
    }
  ]
}
```

### Laya UI JSON 格式（每页组件树）

```json
{
  "type": "KlBox",
  "props": { "width": 1920, "height": 1080 },
  "child": [
    {
      "type": "KlLabel",
      "props": { "name": "title", "x": 100, "y": 50, "text": "你好", "fontSize": 32 }
    },
    {
      "type": "ScaleButton",
      "props": { "name": "btn1", "x": 200, "y": 400, "width": 200, "height": 80, "label": "开始" }
    }
  ]
}
```

---

## 当前实现状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 编辑器 UI（React） | ✅ 完成 | Toolbar / PropertyPanel / PageList |
| Laya 画布集成 | ✅ 完成 | layaBridge.ts |
| 框选 / 多选 | ✅ 完成 | 框选 + Delete 删除 |
| 预览模式 | ✅ 完成 | Laya 原生预览 |
| 组件渲染层 | 🔄 重构中 | 从自定义 12 类型 → Kl* 组件 |
| 序列化导出 | ⏳ 待开发 | 输出 Laya UI JSON + finalConfig |
| 代码生成器 | ⏳ 待开发 | 生成 Page0.js 薄包装 |

---

## 重构路径

### 阶段 1：组件渲染层切换（当前）

把 `layaBridge.ts` 的 `typeMap + applyProps` 替换为直接实例化 Kl* 组件：

```typescript
// 之前：手动绘制
const typeMap = { text: 'Label', button: 'Button', ... };
applyProps(obj, element); // 手动 drawRect / fillText

// 之后：直接用 Kl* 组件
const comp = new (window as any).KlLabel();
comp.text = element.content;
comp.fontSize = element.fontSize;
```

### 阶段 2：元素模型对齐

把编辑器的元素类型从自定义 12 种改为 Kl* 组件名，属性字段直接对应组件属性。

### 阶段 3：序列化导出

实现 `serialize()` 函数，遍历 stage 子对象，输出 Laya UI JSON。

### 阶段 4：课件包生成

实现导出功能，生成完整课件包（finalConfig + UI JSON + 资源 + 薄包装 JS）。

---

## 参考文档

- [sdk_baiya 组件文档](./sdk-baiya-components.md)
- 研究报告：`/Users/wills/code/vipthink/pageshare-laya-research/`
- 最优方案原文：`pageshare-laya-research/optimal-solution-modern-frontend-sdk.md`
