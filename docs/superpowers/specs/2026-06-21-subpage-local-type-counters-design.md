# SubPage 局部类型计数器设计

## 背景

当前编辑器使用全局 `_typeCounters` 为所有元素命名，导致跨小关卡（SubPage）序号递增：
- 第1个小关卡：`MatchingGame_1`
- 第2个小关卡：`MatchingGame_2`

**目标**：改为每个小关卡独立计数，每个小关卡都从 `_1` 开始。

## 核心改动

### 1. 数据模型

**SubPage 接口** (`src/types/index.ts`)
```typescript
export interface SubPage {
  id: string;
  name: string;
  elements: Element[];
  frozen?: boolean;
  /** 运行时类型计数器：记录每个组件类型在此 SubPage 内已用到的最大序号（不保存到 JSON） */
  typeCounters?: Record<string, number>;
}
```

**关键约束**：
- `typeCounters` 是派生数据，不写入 JSON
- 每次打开课件时从 `elements` 数组重建
- 格式：`{ 'MatchingGame': 3, 'NewImage': 5, ... }`

### 2. 计数器初始化

**扫描函数** (`src/store/editorStore.ts` 或 `src/elements/elementMeta.ts`)
```typescript
function updateSubPageTypeCounters(subPage: SubPage): void {
  const counters: Record<string, number> = {};
  
  for (const el of subPage.elements) {
    // 匹配 "Type_数字" 格式，如 "MatchingGame_2"
    const match = el.name?.match(/^(.+?)_(\d+)$/);
    if (match) {
      const [, type, numStr] = match;
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        counters[type] = Math.max(counters[type] ?? 0, num);
      }
    }
  }
  
  subPage.typeCounters = counters;
}
```

**调用时机**：
- `loadCourse` 时遍历所有 Stage → SubPage → 调用 `updateSubPageTypeCounters`
- 包括 `stages` 和 `previewStages`

### 3. 元素创建逻辑

**createDefaultElement 签名变更** (`src/elements/elementMeta.ts`)
```typescript
// 修改前
export function createDefaultElement(type: string): Element

// 修改后
export function createDefaultElement(type: string, subPage?: SubPage): Element
```

**实现逻辑**：
```typescript
export function createDefaultElement(type: string, subPage?: SubPage): Element {
  const meta = elementMeta[type];
  if (!meta) console.warn('[elementMeta] Unknown type:', type);
  
  // 使用 SubPage 局部计数器，fallback 到全局计数器（兼容过渡期）
  const counters = subPage?.typeCounters ?? _typeCounters;
  counters[type] = (counters[type] ?? 0) + 1;
  
  const extraProps: Record<string, unknown> = {};
  if (type === 'NewTextArea') {
    try {
      const last = localStorage.getItem('forge_lastFontLibraryId');
      if (last) extraProps.fontLibraryId = last;
    } catch { /* localStorage 失败时不干预 */ }
  }
  
  return {
    id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${(_elIdSeq++).toString(36)}`,
    type,
    layaType: meta?.layaType ?? 'Box',
    name: `${type}_${counters[type]}`,
    x: meta?.defaultPosition?.x ?? 100, 
    y: meta?.defaultPosition?.y ?? 100,
    ...(meta?.defaultSize ?? { width: 100, height: 100 }),
    opacity: 1, 
    rotation: 0, 
    actions: [],
    props: {
      ...(meta?.defaultProps ?? {}),
      ...extraProps,
      ...(meta?.varFromName ? { var: `${type}_${counters[type]}` } : {}),
    },
  } as Element;
}
```

### 4. 调用点更新

所有调用 `createDefaultElement` 的地方需要传入当前 `subPage`：

**editorStore.ts**：
- `addChoiceOption` - 添加选择题选项
- `addFillBlankInput` - 添加填空题输入框
- `addMatchingPair` - 添加连线题配对
- `addDropObj` / `addDragObj` - 添加拖拽对象
- 以及其他所有 store action 中创建元素的地方

**ElementToolbar.tsx**：
- `handleAdd` - 工具栏添加单个组件
- `handleAddKeyboard` - 添加键盘
- `handleAddPageTurn` - 添加翻页容器
- `handleAddBrushSprite` - 添加画笔
- `handleAddChoice` - 添加选择题
- `handleAddFillBlank` - 添加填空题
- `handleAddMatching` - 添加连线题
- `handleAddDragDrop` - 添加拖拽题

**Canvas.tsx**：
- 拖放音频文件创建 `SoundButton`
- 拖放图片文件创建 `NewImage`

**ImportPPTDialog.tsx / ImportImagesDialog.tsx**：
- 批量导入时创建 `NewImage`

**获取当前 SubPage**：
- store 中：`const sp = findSubPage(state.currentCourse, state.currentSubPageId)`
- 组件中：`const currentSubPage = useEditorStore(s => getCurrentSubPage(s))`（需要添加 selector）

## 边界情况

### 删除元素后的命名

**策略**：递增，不回填

**示例**：
- 初始：`MatchingGame_1`, `MatchingGame_2`
- 删除 `MatchingGame_2`
- 再添加 → `MatchingGame_3`（不是 `MatchingGame_2`）

**优势**：
- 序号永不重复，避免 undo/redo 冲突
- 有历史痕迹，方便调试
- 实现简单，计数器只增不减

### 旧课件兼容

**场景 1**：打开旧课件（无 `typeCounters` 字段）
- `loadCourse` 时扫描元素，提取最大序号
- 重建 `typeCounters`
- 示例：已有 `NewImage_1` 到 `NewImage_8` → `{ NewImage: 8 }`

**场景 2**：元素名称不规范
- 手动改过名称（如 `my_custom_name`）→ 跳过，不影响计数器
- 名称格式错误（如 `Image_abc`）→ parseInt 返回 NaN，跳过

**场景 3**：空小关卡
- 没有元素 → `typeCounters` 初始化为 `{}`
- 添加第一个元素 → 从 `_1` 开始

### 批量操作

**导入 5 张图片**：
```typescript
for (const imgPath of imagePaths) {
  const el = createDefaultElement('NewImage', subPage);
  // el.name = NewImage_1, NewImage_2, ..., NewImage_5
  subPage.elements.push(el);
}
```
计数器依次递增 5 次。

**复制粘贴元素**：
- 粘贴时调用 `createDefaultElement`，获得新序号
- 不复用原元素的名称

## 实现步骤

1. 修改 `SubPage` 接口，添加 `typeCounters` 字段
2. 实现 `updateSubPageTypeCounters` 扫描函数
3. 修改 `createDefaultElement` 签名和实现
4. 在 `loadCourse` 时初始化所有 SubPage 的计数器
5. 修改所有调用点，传入当前 `subPage`：
   - `editorStore.ts` 中所有 action
   - `ElementToolbar.tsx` 中所有添加组件的函数
   - `Canvas.tsx` 拖放处理
   - `ImportPPTDialog.tsx` / `ImportImagesDialog.tsx` 批量导入
6. 测试：创建、删除、导入、保存/加载、旧课件兼容

## 验证要点

- [ ] 新建课件，第1个小关卡添加 `MatchingGame` → 命名为 `MatchingGame_1`
- [ ] 切换到第2个小关卡，添加 `MatchingGame` → 命名为 `MatchingGame_1`（重新从1开始）
- [ ] 删除 `MatchingGame_2`，再添加 → 命名为 `MatchingGame_3`（递增，不回填）
- [ ] 批量导入 5 张图片 → 命名为 `NewImage_1` 到 `NewImage_5`
- [ ] 保存课件，关闭，重新打开 → 计数器正确重建，新添加元素从最大序号+1开始
- [ ] 打开旧课件（无 `typeCounters` 字段）→ 自动扫描重建，新元素命名正确
- [ ] 手动修改元素名称后，新添加元素仍然按计数器递增（不受手动名称影响）

## 影响范围

**代码文件**（6 个）：
- `src/types/index.ts`
- `src/elements/elementMeta.ts`
- `src/store/editorStore.ts`
- `src/components/ElementToolbar.tsx`
- `src/components/Canvas.tsx`
- `src/components/ImportPPTDialog.tsx`
- `src/components/ImportImagesDialog.tsx`

**用户体验**：
- 每个小关卡的组件命名更清晰，从 `_1` 开始
- 不影响现有课件，旧课件自动兼容

**性能**：
- 打开课件时扫描元素（毫秒级，可忽略）
- 创建元素时多传一个参数（无影响）
