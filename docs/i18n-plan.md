# 语言包国际化实施计划

**作者**: Wills.Deng【微信：43592330】  
**第二作者**: AI 助手 Kiro  
**日期**: 2026-04-27

---

## 一、现状分析

### 1.1 当前问题
- 界面文本散落在各个组件中，硬编码为中文
- 部分组件有英文注释，但没有统一的多语言支持
- 缺少语言切换机制
- 没有统一的翻译管理

### 1.2 已有的文本类型
1. **UI 标签**: 按钮、菜单、标题等
2. **提示信息**: Toast、确认对话框、错误提示
3. **组件元数据**: 组件名称、属性标签、分类名称
4. **占位符**: 输入框提示文字
5. **帮助文本**: 说明、提示、快捷键说明

---

## 二、技术方案

### 2.1 i18n 库选择
**推荐**: `react-i18next`

**理由**:
- React 生态标准方案
- 支持命名空间（namespace）
- 支持嵌套翻译键
- 支持插值和复数
- 轻量级，无额外依赖

### 2.2 目录结构
```
src/
├── i18n/
│   ├── index.ts           # i18n 初始化配置
│   ├── locales/
│   │   ├── zh-CN/
│   │   │   ├── common.json      # 通用文本
│   │   │   ├── toolbar.json     # 工具栏
│   │   │   ├── property.json    # 属性面板
│   │   │   ├── elements.json    # 组件元数据
│   │   │   ├── actions.json     # 动作/事件
│   │   │   └── messages.json    # 提示信息
│   │   └── en-US/
│   │       ├── common.json
│   │       ├── toolbar.json
│   │       ├── property.json
│   │       ├── elements.json
│   │       ├── actions.json
│   │       └── messages.json
│   └── types.ts           # TypeScript 类型定义
```

### 2.3 语言包结构示例

#### common.json (通用)
```json
{
  "app": {
    "title": "Forge 编辑器",
    "loading": "加载中...",
    "saving": "保存中...",
    "saved": "已保存"
  },
  "actions": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "confirm": "确认",
    "close": "关闭",
    "add": "添加",
    "edit": "编辑",
    "copy": "复制",
    "paste": "粘贴",
    "undo": "撤销",
    "redo": "重做"
  },
  "units": {
    "px": "像素",
    "percent": "百分比",
    "seconds": "秒"
  }
}
```

#### toolbar.json (工具栏)
```json
{
  "file": {
    "label": "文件",
    "new": "新建课件",
    "open": "打开",
    "save": "保存",
    "export": "导出"
  },
  "edit": {
    "label": "编辑",
    "undo": "撤销",
    "redo": "重做",
    "cut": "剪切",
    "copy": "复制",
    "paste": "粘贴"
  },
  "view": {
    "label": "视图",
    "grid": "网格",
    "ruler": "标尺",
    "zoom": "缩放"
  }
}
```

#### elements.json (组件元数据)
```json
{
  "categories": {
    "basic": "基础组件",
    "container": "容器",
    "choice": "选择题",
    "drag": "拖拽",
    "line": "连线",
    "maze": "迷宫",
    "effect": "特效",
    "keyboard": "键盘",
    "media": "媒体"
  },
  "types": {
    "Label": "文本",
    "ScaleButton": "按钮",
    "SoundButton": "音频按钮",
    "Image": "图片",
    "TextInput": "输入框",
    "CheckBox": "复选框",
    "Radio": "单选框",
    "Box": "容器",
    "Panel": "面板"
  },
  "properties": {
    "text": "文本",
    "fontSize": "字号",
    "color": "颜色",
    "bold": "粗体",
    "italic": "斜体",
    "align": "对齐",
    "width": "宽度",
    "height": "高度",
    "x": "X坐标",
    "y": "Y坐标",
    "rotation": "旋转",
    "opacity": "透明度"
  }
}
```

#### messages.json (提示信息)
```json
{
  "success": {
    "saved": "保存成功",
    "exported": "导出成功",
    "copied": "已复制",
    "deleted": "已删除"
  },
  "error": {
    "saveFailed": "保存失败",
    "exportFailed": "导出失败",
    "loadFailed": "加载失败",
    "invalidInput": "输入无效"
  },
  "confirm": {
    "delete": "确定要删除吗？",
    "discard": "确定要放弃更改吗？",
    "overwrite": "文件已存在，是否覆盖？"
  }
}
```

---

## 三、实施步骤

### 阶段 1: 基础设施搭建 (1-2 小时)

#### 任务 1.1: 安装依赖
```bash
cd /Users/wills/code/vipthink/forge
pnpm add react-i18next i18next
```

#### 任务 1.2: 创建 i18n 配置
- 创建 `src/i18n/index.ts`
- 初始化 i18next
- 配置语言检测和回退

#### 任务 1.3: 创建语言包目录结构
- 创建 `src/i18n/locales/zh-CN/` 和 `en-US/`
- 创建各个命名空间的 JSON 文件

#### 任务 1.4: 集成到应用
- 在 `src/main.tsx` 中初始化 i18n
- 添加语言切换 UI（在顶部工具栏）

---

### 阶段 2: 提取和翻译文本 (4-6 小时)

#### 任务 2.1: 提取通用文本
**文件**: `common.json`
- 按钮标签（保存、取消、删除等）
- 状态文本（加载中、保存中等）
- 单位（像素、百分比等）

#### 任务 2.2: 提取工具栏文本
**文件**: `toolbar.json`
- 文件菜单
- 编辑菜单
- 视图菜单
- 工具栏按钮

**涉及组件**:
- `src/components/Toolbar.tsx`
- `src/components/FileMenu.tsx`

#### 任务 2.3: 提取属性面板文本
**文件**: `property.json`
- 属性标签
- 分组标题
- 对齐按钮
- 变换属性

**涉及组件**:
- `src/components/PropertyPanel.tsx`
- `src/components/FieldRenderer.tsx`

#### 任务 2.4: 提取组件元数据
**文件**: `elements.json`
- 组件分类名称
- 组件类型名称
- 属性名称和标签

**涉及文件**:
- `src/elements/elementMeta.ts`

#### 任务 2.5: 提取提示信息
**文件**: `messages.json`
- Toast 提示
- 确认对话框
- 错误信息

**涉及组件**:
- `src/components/ConfirmDialog.tsx`
- `src/utils/toast.ts`

#### 任务 2.6: 提取其他组件文本
- `src/components/Canvas.tsx` - 画布提示
- `src/components/PageList.tsx` - 页面列表
- `src/components/SkinEditor.tsx` - 皮肤编辑器
- `src/components/ActionEditor.tsx` - 动作编辑器
- `src/components/EditorPreview.tsx` - 预览界面

---

### 阶段 3: 组件改造 (3-4 小时)

#### 任务 3.1: 改造 Toolbar
```tsx
// Before
<button>保存</button>

// After
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('toolbar');
<button>{t('file.save')}</button>
```

#### 任务 3.2: 改造 PropertyPanel
```tsx
// Before
<span>文本</span>

// After
const { t } = useTranslation('property');
<span>{t('text')}</span>
```

#### 任务 3.3: 改造 elementMeta
```tsx
// Before
label: '文本'

// After
import i18n from '../i18n';
label: i18n.t('elements:types.Label')
```

#### 任务 3.4: 改造 Toast 和对话框
```tsx
// Before
showToast('保存成功', 'success');

// After
import i18n from '../i18n';
showToast(i18n.t('messages:success.saved'), 'success');
```

---

### 阶段 4: 语言切换 UI (1 小时)

#### 任务 4.1: 添加语言切换按钮
在 `Toolbar.tsx` 右上角添加语言切换下拉菜单：
```tsx
<select onChange={(e) => i18n.changeLanguage(e.target.value)}>
  <option value="zh-CN">中文</option>
  <option value="en-US">English</option>
</select>
```

#### 任务 4.2: 持久化语言选择
- 使用 localStorage 保存用户选择
- 应用启动时读取并应用

---

### 阶段 5: 英文翻译 (2-3 小时)

#### 任务 5.1: 翻译 common.json
#### 任务 5.2: 翻译 toolbar.json
#### 任务 5.3: 翻译 property.json
#### 任务 5.4: 翻译 elements.json
#### 任务 5.5: 翻译 messages.json

**翻译原则**:
- 使用简洁、专业的术语
- 保持一致性（同一概念使用相同翻译）
- 参考业界标准（如 Figma、Sketch 的英文界面）

---

### 阶段 6: 测试和优化 (1-2 小时)

#### 任务 6.1: 功能测试
- 切换语言后所有文本正确显示
- 动态内容（如 Toast）正确翻译
- 组件元数据正确翻译

#### 任务 6.2: 边界测试
- 长文本是否溢出
- 不同语言下布局是否正常
- 缺失翻译时的回退机制

#### 任务 6.3: 性能测试
- 语言切换响应速度
- 首次加载时间

---

## 四、技术细节

### 4.1 i18n 初始化代码

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 导入语言包
import zhCN_common from './locales/zh-CN/common.json';
import zhCN_toolbar from './locales/zh-CN/toolbar.json';
import zhCN_property from './locales/zh-CN/property.json';
import zhCN_elements from './locales/zh-CN/elements.json';
import zhCN_messages from './locales/zh-CN/messages.json';

import enUS_common from './locales/en-US/common.json';
import enUS_toolbar from './locales/en-US/toolbar.json';
import enUS_property from './locales/en-US/property.json';
import enUS_elements from './locales/en-US/elements.json';
import enUS_messages from './locales/en-US/messages.json';

const resources = {
  'zh-CN': {
    common: zhCN_common,
    toolbar: zhCN_toolbar,
    property: zhCN_property,
    elements: zhCN_elements,
    messages: zhCN_messages,
  },
  'en-US': {
    common: enUS_common,
    toolbar: enUS_toolbar,
    property: enUS_property,
    elements: enUS_elements,
    messages: enUS_messages,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('forge-language') || 'zh-CN',
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

// 监听语言变化，保存到 localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('forge-language', lng);
});

export default i18n;
```

### 4.2 使用示例

#### 在组件中使用
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('toolbar');
  
  return (
    <div>
      <button>{t('file.save')}</button>
      <button>{t('file.export')}</button>
    </div>
  );
}
```

#### 在非组件中使用
```typescript
import i18n from '../i18n';

// 直接调用
const message = i18n.t('messages:success.saved');
showToast(message, 'success');
```

#### 带插值的翻译
```json
{
  "deleteConfirm": "确定要删除 {{name}} 吗？"
}
```

```tsx
t('deleteConfirm', { name: '文本1' })
// 输出: "确定要删除 文本1 吗？"
```

---

## 五、工作量估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 阶段 1 | 基础设施搭建 | 1-2 小时 |
| 阶段 2 | 提取和翻译文本 | 4-6 小时 |
| 阶段 3 | 组件改造 | 3-4 小时 |
| 阶段 4 | 语言切换 UI | 1 小时 |
| 阶段 5 | 英文翻译 | 2-3 小时 |
| 阶段 6 | 测试和优化 | 1-2 小时 |
| **总计** | | **12-18 小时** |

---

## 六、优先级建议

### P0 (必须完成)
- 阶段 1: 基础设施
- 阶段 2.1-2.3: 核心 UI 文本提取
- 阶段 3.1-3.2: 核心组件改造
- 阶段 4: 语言切换

### P1 (重要)
- 阶段 2.4-2.5: 元数据和提示信息
- 阶段 3.3-3.4: 元数据和提示改造
- 阶段 5: 英文翻译

### P2 (可选)
- 阶段 2.6: 其他组件
- 阶段 6: 深度测试和优化

---

## 七、注意事项

### 7.1 翻译键命名规范
- 使用小驼峰或点分隔: `file.save` 或 `fileSave`
- 保持层级清晰: `toolbar.file.save`
- 避免过深嵌套（最多 3 层）

### 7.2 翻译内容规范
- 中文使用简体中文
- 英文首字母大写（标题）或全小写（句子）
- 保持简洁，避免冗长

### 7.3 代码规范
- 统一使用 `useTranslation` hook
- 命名空间明确（不要全部放在 common）
- 避免硬编码文本

### 7.4 性能优化
- 使用命名空间按需加载
- 避免在循环中调用 `t()`
- 缓存常用翻译

---

## 八、后续扩展

### 8.1 更多语言支持
- 繁体中文 (zh-TW)
- 日语 (ja-JP)
- 韩语 (ko-KR)

### 8.2 翻译管理平台
- 集成 Crowdin 或 Lokalise
- 支持协作翻译
- 自动同步翻译

### 8.3 动态语言包
- 从服务器加载语言包
- 支持热更新
- 支持用户自定义翻译

---

## 九、参考资料

- [react-i18next 官方文档](https://react.i18next.com/)
- [i18next 最佳实践](https://www.i18next.com/principles/best-practices)
- [Figma 英文界面参考](https://www.figma.com/)
- [Material Design 多语言指南](https://material.io/design/communication/writing.html)
