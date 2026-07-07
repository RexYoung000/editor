# SubPage 局部类型计数器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将编辑器组件命名从全局计数器改为 SubPage 局部计数器，使每个小关卡内组件命名从 _1 开始递增

**Architecture:** 在 SubPage 接口添加运行时 typeCounters 字段，打开课件时扫描元素重建计数器，createDefaultElement 函数改为接收 subPage 参数并使用其局部计数器

**Tech Stack:** TypeScript, Zustand, React

---

## 文件结构映射

**核心文件**：
- `src/types/index.ts` - SubPage 接口定义，添加 typeCounters 字段
- `src/elements/elementMeta.ts` - createDefaultElement 函数修改，添加 updateSubPageTypeCounters 扫描函数
- `src/store/editorStore.ts` - setCurrentCourse action 中初始化计数器，所有创建元素的 action 传入 subPage

**组件文件**：
- `src/components/ElementToolbar.tsx` - 所有工具栏添加组件函数传入 subPage
- `src/components/Canvas.tsx` - 拖放文件创建元素传入 subPage
- `src/components/ImportPPTDialog.tsx` - PPT 导入传入 subPage
- `src/components/ImportImagesDialog.tsx` - 批量图片导入传入 subPage

---

### Task 1: 修改 SubPage 接口

**Files:**
- Modify: `src/types/index.ts:40-46`

- [ ] **Step 1: 添加 typeCounters 字段到 SubPage 接口**

```typescript
export interface SubPage {
  id: string;
  name: string;
  elements: Element[];
  /** frozen = 不允许添加新组件 */
  frozen?: boolean;
  /** 运行时类型计数器：记录每个组件类型在此 SubPage 内已用到的最大序号（不保存到 JSON） */
  typeCounters?: Record<string, number>;
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/types/index.ts
git commit -m "feat: 添加 SubPage.typeCounters 运行时字段"
```

---

### Task 2: 实现扫描函数

**Files:**
- Modify: `src/elements/elementMeta.ts:543-595`

- [ ] **Step 1: 在 createDefaultElement 函数之前添加 updateSubPageTypeCounters 函数**

在 `src/elements/elementMeta.ts` 的 `const _typeCounters: Record<string, number> = {};` 行之后，`createDefaultElement` 函数之前添加：

```typescript
/**
 * 扫描 SubPage 的所有元素，提取每个类型的最大序号，重建 typeCounters
 * 每次打开课件时调用，兼容旧课件且保证数据一致性
 */
export function updateSubPageTypeCounters(subPage: SubPage): void {
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

- [ ] **Step 2: Commit**

```powershell
git add src/elements/elementMeta.ts
git commit -m "feat: 添加 updateSubPageTypeCounters 扫描函数"
```

---

### Task 3: 修改 createDefaultElement 函数

**Files:**
- Modify: `src/elements/elementMeta.ts:548-573`

- [ ] **Step 1: 修改 createDefaultElement 函数签名和实现**

将函数签名从：
```typescript
export function createDefaultElement(type: string): Element {
```

改为：
```typescript
export function createDefaultElement(type: string, subPage?: SubPage): Element {
```

将函数体中的这两行：
```typescript
  _typeCounters[type] = (_typeCounters[type] ?? 0) + 1;
  ...
  name: `${type}_${_typeCounters[type]}`,
```

改为：
```typescript
  // 使用 SubPage 局部计数器，fallback 到全局计数器（兼容过渡期）
  const counters = subPage?.typeCounters ?? _typeCounters;
  counters[type] = (counters[type] ?? 0) + 1;
  ...
  name: `${type}_${counters[type]}`,
```

完整修改后的函数：
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
    x: meta?.defaultPosition?.x ?? 100, y: meta?.defaultPosition?.y ?? 100,
    ...(meta?.defaultSize ?? { width: 100, height: 100 }),
    opacity: 1, rotation: 0, actions: [],
    props: {
      ...(meta?.defaultProps ?? {}),
      ...extraProps,
      ...(meta?.varFromName ? { var: `${type}_${counters[type]}` } : {}),
    },
  } as Element;
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/elements/elementMeta.ts
git commit -m "feat: createDefaultElement 支持 SubPage 局部计数器"
```

---

### Task 4: 在 loadCourse 时初始化计数器

**Files:**
- Modify: `src/store/editorStore.ts:289-306`
- Import: `src/store/editorStore.ts:18` 添加 `updateSubPageTypeCounters`

- [ ] **Step 1: 在 import 语句中添加 updateSubPageTypeCounters**

将第 18 行的 import 从：
```typescript
import { getUniqueElementName, normalizeElementNames, createDefaultElement, elementMeta } from '../elements/elementMeta';
```

改为：
```typescript
import { getUniqueElementName, normalizeElementNames, createDefaultElement, elementMeta, updateSubPageTypeCounters } from '../elements/elementMeta';
```

- [ ] **Step 2: 在 setCurrentCourse action 中初始化所有 SubPage 的 typeCounters**

在 `setCurrentCourse` action 的 `ensureCourseShape(course);` 行之后，`course.stages = course.stages.map...` 之前添加：

```typescript
    setCurrentCourse: (course) =>
      set((state) => {
        ensureCourseShape(course);
        
        // 初始化所有 SubPage 的 typeCounters（扫描现有元素）
        course.stages.forEach(stage => {
          stage.subPages.forEach(subPage => {
            updateSubPageTypeCounters(subPage);
          });
        });
        course.previewStages?.forEach(stage => {
          stage.subPages.forEach(subPage => {
            updateSubPageTypeCounters(subPage);
          });
        });
        
        course.stages = course.stages.map((stage) => ({
```

- [ ] **Step 3: Commit**

```powershell
git add src/store/editorStore.ts
git commit -m "feat: loadCourse 时初始化所有 SubPage 的 typeCounters"
```

---

### Task 5: 添加 getCurrentSubPage selector

**Files:**
- Modify: `src/store/editorStore.ts` 末尾（在 create 函数之后）

- [ ] **Step 1: 添加 getCurrentSubPage selector 函数**

在 `src/store/editorStore.ts` 文件末尾，`export const useEditorStore = create...` 之后添加：

```typescript
/** 辅助函数：获取当前 SubPage */
function findSubPage(course: Course | null, subPageId: string | null): SubPage | null {
  if (!course || !subPageId) return null;
  for (const stage of course.stages) {
    const found = stage.subPages.find(sp => sp.id === subPageId);
    if (found) return found;
  }
  if (course.previewStages) {
    for (const stage of course.previewStages) {
      const found = stage.subPages.find(sp => sp.id === subPageId);
      if (found) return found;
    }
  }
  return null;
}

export function getCurrentSubPage(state: EditorState): SubPage | null {
  return findSubPage(state.currentCourse, state.currentSubPageId);
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/store/editorStore.ts
git commit -m "feat: 添加 getCurrentSubPage selector 辅助函数"
```

---

### Task 6: 更新 editorStore 中的所有调用点

**Files:**
- Modify: `src/store/editorStore.ts` 多处

- [ ] **Step 1: 找到 editorStore 中所有 createDefaultElement 调用**

运行搜索：
```powershell
Select-String -Path "src\store\editorStore.ts" -Pattern "createDefaultElement" -Context 0,3
```

- [ ] **Step 2: 修改 addContainerToPageTurn (约 L1488)**

将：
```typescript
const newBox = createDefaultElement('ContainerBox');
```
改为：
```typescript
const sp = findSubPage(state.currentCourse, state.currentSubPageId);
const newBox = createDefaultElement('ContainerBox', sp ?? undefined);
```

- [ ] **Step 3: 修改 addContainerToPageTurn 中的 newTab 创建 (约 L1497)**

将：
```typescript
newTab = createDefaultElement('SpeechSelectableObj');
```
改为：
```typescript
newTab = createDefaultElement('SpeechSelectableObj', sp ?? undefined);
```

- [ ] **Step 4: 修改 updatePageTurnContainer 中的 leftBtn 和 rightBtn (约 L1662, 1671)**

将：
```typescript
const leftBtn = createDefaultElement('PageTurnLeftBtn');
...
const rightBtn = createDefaultElement('PageTurnRightBtn');
```
改为：
```typescript
const sp = findSubPage(state.currentCourse, state.currentSubPageId);
const leftBtn = createDefaultElement('PageTurnLeftBtn', sp ?? undefined);
...
const rightBtn = createDefaultElement('PageTurnRightBtn', sp ?? undefined);
```

- [ ] **Step 5: 修改 updatePageTurnContainer 中补齐标签的 tab 创建 (约 L1691)**

将：
```typescript
const tab = createDefaultElement('SpeechSelectableObj');
```
改为：
```typescript
const tab = createDefaultElement('SpeechSelectableObj', sp ?? undefined);
```

- [ ] **Step 6: 修改 addChoiceOption (约 L1792)**

将：
```typescript
const newOpt = createDefaultElement('SpeechSelectableObj');
```
改为：
```typescript
const sp = findSubPage(state.currentCourse, state.currentSubPageId);
const newOpt = createDefaultElement('SpeechSelectableObj', sp ?? undefined);
```

- [ ] **Step 7: 修改 addFillBlankInput (约 L1830)**

将：
```typescript
const newInput = createDefaultElement('KlInputImage');
```
改为：
```typescript
const sp = findSubPage(state.currentCourse, state.currentSubPageId);
const newInput = createDefaultElement('KlInputImage', sp ?? undefined);
```

- [ ] **Step 8: 修改 addMatchingPair 中的 leftItem 和 rightItem (约 L1920, 1927)**

将：
```typescript
const leftItem = createDefaultElement('MatchingItem');
...
const rightItem = createDefaultElement('MatchingItem');
```
改为：
```typescript
const sp = findSubPage(state.currentCourse, state.currentSubPageId);
const leftItem = createDefaultElement('MatchingItem', sp ?? undefined);
...
const rightItem = createDefaultElement('MatchingItem', sp ?? undefined);
```

- [ ] **Step 9: 修改 addDropObj (约 L2004)**

将：
```typescript
const newEl = createDefaultElement('DropObj');
```
改为：
```typescript
const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === state.currentSubPageId);
const newEl = createDefaultElement('DropObj', sp ?? undefined);
```

- [ ] **Step 10: 修改 addDragObj (约 L2054)**

将：
```typescript
const newEl = createDefaultElement('DragObj');
```
改为：
```typescript
const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === state.currentSubPageId);
const newEl = createDefaultElement('DragObj', sp ?? undefined);
```

- [ ] **Step 11: Commit**

```powershell
git add src/store/editorStore.ts
git commit -m "feat: editorStore 所有 action 传入 subPage 到 createDefaultElement"
```

---

### Task 7: 更新 ElementToolbar 中的所有调用点

**Files:**
- Modify: `src/components/ElementToolbar.tsx` 多处

- [ ] **Step 1: 导入 getCurrentSubPage**

在文件顶部添加 import：
```typescript
import { useEditorStore, getCurrentSubPage } from '../store/editorStore';
```

- [ ] **Step 2: 在 ElementToolbar 组件内获取 currentSubPage**

在 `ElementToolbar` 函数组件顶部，`const addElement = useEditorStore(...);` 附近添加：
```typescript
const currentSubPage = useEditorStore(getCurrentSubPage);
```

- [ ] **Step 3: 修改 handleAdd 函数 (约 L82)**

将：
```typescript
const element = createDefaultElement(type);
```
改为：
```typescript
const element = createDefaultElement(type, currentSubPage ?? undefined);
```

- [ ] **Step 4: 修改 handleAdd 中的 kbElement 创建 (约 L130)**

将：
```typescript
const kbElement = createDefaultElement('KlBaseKeyboard');
```
改为：
```typescript
const kbElement = createDefaultElement('KlBaseKeyboard', currentSubPage ?? undefined);
```

- [ ] **Step 5: 修改 handleAddKeyboard (约 L182)**

将：
```typescript
const element = createDefaultElement('KlBaseKeyboard');
```
改为：
```typescript
const element = createDefaultElement('KlBaseKeyboard', currentSubPage ?? undefined);
```

- [ ] **Step 6: 修改 handleAddPageTurn (约 L201-227)**

将所有 createDefaultElement 调用添加 currentSubPage：
```typescript
const ptBox = createDefaultElement('PageTurnBox', currentSubPage ?? undefined);
const pageBox = createDefaultElement('ContainerBox', currentSubPage ?? undefined);
const leftBtn = createDefaultElement('PageTurnLeftBtn', currentSubPage ?? undefined);
const rightBtn = createDefaultElement('PageTurnRightBtn', currentSubPage ?? undefined);
const tabBtn = createDefaultElement('SpeechSelectableObj', currentSubPage ?? undefined);
```

- [ ] **Step 7: 修改 handleAddBrushSprite (约 L263-265)**

将：
```typescript
const brushBox = createDefaultElement('NewBrushSprite');
const drawBtn  = createDefaultElement('BrushDrawBtn');
const clearBtn = createDefaultElement('BrushClearBtn');
```
改为：
```typescript
const brushBox = createDefaultElement('NewBrushSprite', currentSubPage ?? undefined);
const drawBtn  = createDefaultElement('BrushDrawBtn', currentSubPage ?? undefined);
const clearBtn = createDefaultElement('BrushClearBtn', currentSubPage ?? undefined);
```

- [ ] **Step 8: 修改 handleAddChoice (约 L297, 306, 340)**

将：
```typescript
const choiceBox = createDefaultElement('ChoiceBox');
...
const opt = createDefaultElement('SpeechSelectableObj');
...
const confirmBtn = createDefaultElement('ConfirmButton');
```
改为：
```typescript
const choiceBox = createDefaultElement('ChoiceBox', currentSubPage ?? undefined);
...
const opt = createDefaultElement('SpeechSelectableObj', currentSubPage ?? undefined);
...
const confirmBtn = createDefaultElement('ConfirmButton', currentSubPage ?? undefined);
```

- [ ] **Step 9: 修改 handleAddFillBlank (约 L416, 433, 451, 467)**

将：
```typescript
const kbElement = createDefaultElement('KlBaseKeyboard');
...
const inputBox = createDefaultElement('KlInputBox');
...
const firstInput = createDefaultElement('KlInputImage');
...
const confirmBtn = createDefaultElement('ConfirmButton');
```
改为：
```typescript
const kbElement = createDefaultElement('KlBaseKeyboard', currentSubPage ?? undefined);
...
const inputBox = createDefaultElement('KlInputBox', currentSubPage ?? undefined);
...
const firstInput = createDefaultElement('KlInputImage', currentSubPage ?? undefined);
...
const confirmBtn = createDefaultElement('ConfirmButton', currentSubPage ?? undefined);
```

- [ ] **Step 10: 修改 handleAddMatching (约 L492, 506, 520, 555)**

将：
```typescript
const matchingGame = createDefaultElement('MatchingGame');
...
const matchBox = createDefaultElement('Box');
...
const item = createDefaultElement('MatchingItem');
...
const confirmBtn = createDefaultElement('ConfirmButton');
```
改为：
```typescript
const matchingGame = createDefaultElement('MatchingGame', currentSubPage ?? undefined);
...
const matchBox = createDefaultElement('Box', currentSubPage ?? undefined);
...
const item = createDefaultElement('MatchingItem', currentSubPage ?? undefined);
...
const confirmBtn = createDefaultElement('ConfirmButton', currentSubPage ?? undefined);
```

- [ ] **Step 11: 修改 handleAddDragDrop (约 L580-629)**

将：
```typescript
const dvb = createDefaultElement('DragViewBox');
const dropbox = createDefaultElement('DragDropBox');
const dragbox = createDefaultElement('DragDragBox');
const dropObj = createDefaultElement('DropObj');
const dragObj = createDefaultElement('DragObj');
...
const confirmBtn = createDefaultElement('ConfirmButton');
```
改为：
```typescript
const dvb = createDefaultElement('DragViewBox', currentSubPage ?? undefined);
const dropbox = createDefaultElement('DragDropBox', currentSubPage ?? undefined);
const dragbox = createDefaultElement('DragDragBox', currentSubPage ?? undefined);
const dropObj = createDefaultElement('DropObj', currentSubPage ?? undefined);
const dragObj = createDefaultElement('DragObj', currentSubPage ?? undefined);
...
const confirmBtn = createDefaultElement('ConfirmButton', currentSubPage ?? undefined);
```

- [ ] **Step 12: Commit**

```powershell
git add src/components/ElementToolbar.tsx
git commit -m "feat: ElementToolbar 所有组件创建传入 currentSubPage"
```

---

### Task 8: 更新 Canvas 中的拖放处理

**Files:**
- Modify: `src/components/Canvas.tsx:703, 742`

- [ ] **Step 1: 导入 getCurrentSubPage**

在文件顶部添加 import：
```typescript
import { useEditorStore, getCurrentSubPage } from '../store/editorStore';
```

- [ ] **Step 2: 在 Canvas 组件内获取 currentSubPage**

在 `Canvas` 函数组件顶部添加：
```typescript
const currentSubPage = useEditorStore(getCurrentSubPage);
```

- [ ] **Step 3: 修改音频拖放创建 SoundButton (约 L703)**

将：
```typescript
const el = createDefaultElement('SoundButton');
```
改为：
```typescript
const el = createDefaultElement('SoundButton', currentSubPage ?? undefined);
```

- [ ] **Step 4: 修改图片拖放创建 NewImage (约 L742)**

将：
```typescript
const el = createDefaultElement('NewImage');
```
改为：
```typescript
const el = createDefaultElement('NewImage', currentSubPage ?? undefined);
```

- [ ] **Step 5: Commit**

```powershell
git add src/components/Canvas.tsx
git commit -m "feat: Canvas 拖放创建元素传入 currentSubPage"
```

---

### Task 9: 更新 ImportPPTDialog 批量导入

**Files:**
- Modify: `src/components/ImportPPTDialog.tsx:122`

- [ ] **Step 1: 导入 getCurrentSubPage**

在文件顶部添加 import：
```typescript
import { useEditorStore, getCurrentSubPage } from '../store/editorStore';
```

- [ ] **Step 2: 在 ImportPPTDialog 组件内获取 currentSubPage**

在 `ImportPPTDialog` 函数组件顶部添加：
```typescript
const currentSubPage = useEditorStore(getCurrentSubPage);
```

- [ ] **Step 3: 修改创建 NewImage (约 L122)**

将：
```typescript
const newElement = createDefaultElement('NewImage');
```
改为：
```typescript
const newElement = createDefaultElement('NewImage', currentSubPage ?? undefined);
```

- [ ] **Step 4: Commit**

```powershell
git add src/components/ImportPPTDialog.tsx
git commit -m "feat: ImportPPTDialog 批量导入传入 currentSubPage"
```

---

### Task 10: 更新 ImportImagesDialog 批量导入

**Files:**
- Modify: `src/components/ImportImagesDialog.tsx:123`

- [ ] **Step 1: 导入 getCurrentSubPage**

在文件顶部添加 import：
```typescript
import { useEditorStore, getCurrentSubPage } from '../store/editorStore';
```

- [ ] **Step 2: 在 ImportImagesDialog 组件内获取 currentSubPage**

在 `ImportImagesDialog` 函数组件顶部添加：
```typescript
const currentSubPage = useEditorStore(getCurrentSubPage);
```

- [ ] **Step 3: 修改创建 NewImage (约 L123)**

将：
```typescript
const newElement = createDefaultElement('NewImage');
```
改为：
```typescript
const newElement = createDefaultElement('NewImage', currentSubPage ?? undefined);
```

- [ ] **Step 4: Commit**

```powershell
git add src/components/ImportImagesDialog.tsx
git commit -m "feat: ImportImagesDialog 批量导入传入 currentSubPage"
```

---

### Task 11: 手动测试验证

**Files:**
- Manual testing

- [ ] **Step 1: 启动开发服务器**

```powershell
pnpm dev
```

等待服务器启动完成

- [ ] **Step 2: 测试场景 1 - 新建课件基本功能**

1. 打开编辑器，创建新课件
2. 在第1个小关卡添加 MatchingGame 组件
3. 检查元素列表，名称应为 `MatchingGame_1`
4. 切换到第2个小关卡，再添加 MatchingGame 组件
5. 检查元素列表，名称应为 `MatchingGame_1`（重新从1开始）

- [ ] **Step 3: 测试场景 2 - 删除后递增**

1. 在第1个小关卡添加两个 NewImage 元素：`NewImage_1`, `NewImage_2`
2. 删除 `NewImage_2`
3. 再添加一个 NewImage
4. 检查名称应为 `NewImage_3`（不是 `NewImage_2`）

- [ ] **Step 4: 测试场景 3 - 批量导入**

1. 使用导入图片功能，一次性导入 5 张图片
2. 检查元素列表，应生成 `NewImage_1` 到 `NewImage_5`

- [ ] **Step 5: 测试场景 4 - 保存加载**

1. 在第1个小关卡添加 `MatchingGame_1`, `MatchingGame_2`, `NewImage_1`
2. 保存课件
3. 关闭编辑器，重新打开该课件
4. 在第1个小关卡添加新的 MatchingGame
5. 检查名称应为 `MatchingGame_3`（从最大序号+1继续）

- [ ] **Step 6: 测试场景 5 - 旧课件兼容**

1. 打开一个旧课件（无 typeCounters 字段）
2. 检查现有元素名称正常显示
3. 添加新元素，检查序号从现有最大值+1开始

- [ ] **Step 7: 测试场景 6 - 工具栏所有组件**

1. 在新小关卡中，依次添加以下组件，检查名称都从 `_1` 开始：
   - 选择题容器
   - 填空题容器
   - 连线题容器
   - 拖拽题容器
   - 键盘
   - 翻页容器
   - 画笔

- [ ] **Step 8: 记录测试结果**

如果所有测试通过，在控制台输出：
```
✓ 所有测试场景通过
```

如果有失败，记录具体场景和错误信息

---

## Spec 自审清单

- [x] Spec 覆盖：所有需求都有对应 task
  - SubPage 接口添加 typeCounters → Task 1
  - 扫描函数实现 → Task 2
  - createDefaultElement 修改 → Task 3
  - loadCourse 初始化 → Task 4
  - 所有调用点更新 → Task 5-10
  - 测试验证 → Task 11

- [x] 占位符检查：无 TBD、TODO 或模糊描述

- [x] 类型一致性：
  - `SubPage.typeCounters` 类型为 `Record<string, number>`
  - `createDefaultElement(type: string, subPage?: SubPage)` 签名一致
  - `updateSubPageTypeCounters(subPage: SubPage)` 签名一致
  - `getCurrentSubPage` 返回 `SubPage | null` 类型一致

- [x] 完整性：所有 createDefaultElement 调用点都已覆盖

---