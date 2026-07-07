# 组件 name 与 var 的去重机制

forge 编辑器里有两个看起来相似、但用途完全不同的命名字段：`element.name` 和 `props.var`。两者的去重时机、去重范围、用途都不同。本文记录两者的设计要点，方便后续维护时不踩坑。

## TL;DR

| 字段 | 去重时机 | 去重范围 | 用途 |
|---|---|---|---|
| `element.name` | 编辑器侧（addElement / pasteElements） | **同父节点下兄弟** | Laya `parent.getChildByName('xxx')` 查找子节点 |
| `props.var` | 导出侧（buildVarAssignment） | **整个 SubPage** | LessonZK.ts 里 `this.xxx` 类成员引用 |

两者是**独立机制**，互不干扰。

---

## 一、`element.name`

### 触发时机

只在编辑器侧操作元素时触发，**导出时不再去重**（直接用现有 `element.name`）：

1. 用户从工具栏新增元素 → `addElement` → [editorStore.ts](../src/store/editorStore.ts)
2. 粘贴/复制元素 → `pasteElements` → [editorStore.ts](../src/store/editorStore.ts)
3. 更新元素 name 时同步 var（仅 `varFromName` 的组件）→ `updateElement` → [editorStore.ts](../src/store/editorStore.ts)

### 去重范围：同一父节点下的兄弟

```typescript
// addElement 里的实现
const siblings = page.elements.filter(e => e.parentId === element.parentId);
const existingNames = siblings.map(e => e.name ?? '');
element.name = getUniqueElementName(element.name, existingNames);
```

**不同父节点下可以同名**：

```
SubPage
├── DragViewBox_1
│   ├── dropbox        ← 允许
│   └── dragbox
└── DragViewBox_2
    ├── dropbox        ← 允许（父节点不同）
    └── dragbox
```

### 为什么是局部作用域

Laya 的 `getChildByName(name)` 是**非递归查找**：

```javascript
// sdk_baiya runtime 里这样找子节点：
var dropbox = this.getChildByName('dropbox');
// this 是 DragViewBox，只在直接子节点里找
```

每个 DragViewBox 在各自父容器下找 `dropbox`，互不影响。所以 `name` 只需要**同父节点下唯一**即可。

### 历史问题（已修复）

旧代码使用**全局去重**（`page.elements.map(e => e.name)`），导致：

- 两个 MatchingGame 的子 `_matchBox` 被强制改成 `_matchBox_2`
- sdk_baiya runtime 写死的 `getChildByName('_matchBox')` 找不到第二个
- 预览/导出崩溃

修复后所有元素都按局部作用域去重。这不是优化，是**修 bug**。

---

## 二、`props.var`

### 触发时机

仅在**导出工程**时触发（`exportProject.ts` -> `buildVarAssignment`）。编辑器内不维护 var 唯一性。

### 去重范围：整个 SubPage 全局

```typescript
function buildVarAssignment(page: SubPage, needsVarSet: Set<string>) {
  const used = new Set<string>();
  used.add('_lockBox');
  for (const el of page.elements) {
    if (!needsVarSet.has(el.id)) continue;
    const merged = { ...defaultProps, ...el.props };
    let base = (merged.var as string) || el.name || el.id;
    base = String(base).replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${i}`;
      i += 1;
    }
    used.add(candidate);
    assignment.set(el.id, candidate);
  }
}
```

`used` 是函数顶层局部变量，整个 SubPage 共用一个 Set。

### 为什么是全局作用域

导出后的 LessonZK.ts：

```typescript
class LessonZK_pageX extends Scene {
  dropbox: Box;
  dragbox: Box;
  onAwake() {
    this.dropbox.visible = true;
    this.dragbox.on(...);
  }
}
```

`this.xxx` 在 LessonZK 类里只能挂一个对象。如果两个 var 同名，后赋值的会**覆盖**前一个，代码引用错位。

所以 `var` 的去重范围必须等于 `this` 的作用范围 = **整个 LessonZK 类 = 整个 SubPage**。

### 跨 SubPage 不冲突

每个 SubPage 都调用一次 `buildVarAssignment(page, ...)`，`used` Set 每次重建。不同 SubPage 生成不同的 LessonZK 子类，各自的 `this` 独立，所以跨 SubPage 维度 var 可以重复。

### 哪些元素需要 var

`buildVarAssignment` 只处理 `needsVarSet` 里的元素。`collectElementsNeedingVar` 的规则：

1. 自己有 `actions` 的元素（事件源）
2. 被 `action.targetId` 引用的元素（动作目标）
3. 特殊硬编码组件：DragViewBox
4. 翻页组件：PageTurnBox 关联的 ContainerBox / PageTurnLeftBtn / PageTurnRightBtn
5. `onAutoClick` 所在 SelectableObj 的父 ChoiceBox

**不需要 var 的元素直接跳过**，连 var 都不会生成。例如默认情况下 DragDropBox/DragDragBox 没有 actions、也没人引用，就不会进 needsVarSet。

---

## 三、导出时 name 和 var 的写入路径

### `.scene` / `.lh` 里的 `name` 属性

```typescript
const merged = { ...(meta?.defaultProps ?? {}), ...rawProps };
const rewritten = rewriteProps(merged, resourceMap);
const props: Record<string, unknown> = { x, y, width, height };
if (element.name) props.name = element.name;                    // 1. 顶层 name -> props.name
for (const [k, v] of Object.entries(rewritten)) {
  if (v !== undefined && v !== null && v !== '') props[k] = v;  // 2. element.props.name 覆盖
}
```

**优先级**：`element.props.name`（合并自 `defaultProps.name`）> `element.name`

举例：DragDropBox 的 `defaultProps.name = 'dropbox'`，无论 `element.name` 是什么，最终 `.scene` 里 `name="dropbox"` 都不变。

### 拖拽组件的特殊处理

```typescript
if (element.type === 'DragViewBox') {
  delete props.name;
} else if (['DragDropBox', 'DragDragBox', 'DragObj', 'DropObj'].includes(element.type)) {
  delete props.var;
}
```

| 元素类型 | `.scene` 里有 name | `.scene` 里有 var |
|---|---|---|
| DragViewBox | 否 | 是 |
| DragDropBox | 是 | 否 |
| DragDragBox | 是 | 否 |
| DragObj | 是 | 否 |
| DropObj | 是 | 否 |
| 普通组件 | 看 `element.name` | 看是否在 needsVarSet |

注意：DragDropBox/DragDragBox 即使 `.scene` 里没写 var，**`varAssignment` map 里仍然有它们的 var**（如果进入了 needsVarSet），供 LessonZK.ts 代码引用使用。

---

## 四、实战案例：DragViewBox 的子节点

### 编辑器内 element.name（局部去重）

```
DragViewBox_1
├── dropbox       ← element.name 同父节点下唯一
└── dragbox
DragViewBox_2
├── dropbox       ← 不同父节点，允许同名
└── dragbox
```

### 导出后 .scene 里的 name 属性

```xml
<DragViewBox var="DragViewBox_1">
  <Box name="dropbox" .../>
  <Box name="dragbox" .../>
</DragViewBox>
<DragViewBox var="DragViewBox_2">
  <Box name="dropbox" .../>
  <Box name="dragbox" .../>
</DragViewBox>
```

### sdk_baiya runtime 查找

```javascript
// 在 DragViewBox_1 实例上调用：
var dropbox = this.getChildByName('dropbox');   // 找到 DragViewBox_1 下的 dropbox
// 在 DragViewBox_2 实例上调用：
var dropbox = this.getChildByName('dropbox');   // 找到 DragViewBox_2 下的 dropbox
```

各自找各自的，互不干扰。

### 假设 dropbox 被 action 引用（进入 needsVarSet）

```
DragViewBox_1 下的 dropbox -> var = 'dropbox'
DragViewBox_2 下的 dropbox -> var = 'dropbox_2'   ← buildVarAssignment 全局去重加后缀
```

生成的 LessonZK.ts：

```typescript
this.dropbox.visible = true;     // 指向 DragViewBox_1 下的 dropbox
this.dropbox_2.visible = true;   // 指向 DragViewBox_2 下的 dropbox
```

---

## 五、维护提醒

1. **添加新组件时**，如果 sdk_baiya runtime 会通过硬编码的 `getChildByName('xxx')` 查找子节点，确保该子节点在 `exportChildren` 里写死 `name: 'xxx'`，或者在 ElementToolbar 创建时显式赋值 `element.name = 'xxx'`。
2. **不要在编辑器里用 `element.name` 做跨父节点查找**。当前没有这样的代码，将来也别加。需要查找时用 `element.id`。
3. **var 的生成依赖 element.name 作为 base**，所以即使 name 只局部唯一，多个同名元素进入 needsVarSet 时 var 仍会自动加后缀（`xxx`、`xxx_2`、`xxx_3`），不会冲突。
4. **拖拽相关组件**（DragViewBox / DragDropBox / DragDragBox / DragObj / DropObj）在导出时有 var/name 互斥逻辑，改这些组件的 meta 时注意 [exportProject.ts](../src/utils/exportProject.ts) 里的特殊分支。


注意：DragDropBox/DragDragBox 即使 `.scene` 里没写 var，**`varAssignment` map 里仍然有它们的 var**（如果进入了 needsVarSet），供 LessonZK.ts 代码引用使用。

---

## 四、实战案例：DragViewBox 的子节点

### 编辑器内 element.name（局部去重）

```
DragViewBox_1
├── dropbox       ← element.name 同父节点下唯一
└── dragbox
DragViewBox_2
├── dropbox       ← 不同父节点，允许同名
└── dragbox
```

### 导出后 .scene 里的 name 属性

```xml
<DragViewBox var="DragViewBox_1">
  <Box name="dropbox" .../>
  <Box name="dragbox" .../>
</DragViewBox>
<DragViewBox var="DragViewBox_2">
  <Box name="dropbox" .../>
  <Box name="dragbox" .../>
</DragViewBox>
```

### sdk_baiya runtime 查找

```javascript
// 在 DragViewBox_1 实例上调用：
var dropbox = this.getChildByName('dropbox');   // 找到 DragViewBox_1 下的 dropbox
// 在 DragViewBox_2 实例上调用：
var dropbox = this.getChildByName('dropbox');   // 找到 DragViewBox_2 下的 dropbox
```

各自找各自的，互不干扰。

### 假设 dropbox 被 action 引用（进入 needsVarSet）

```
DragViewBox_1 下的 dropbox -> var = 'dropbox'
DragViewBox_2 下的 dropbox -> var = 'dropbox_2'   ← buildVarAssignment 全局去重加后缀
```

生成的 LessonZK.ts：

```typescript
this.dropbox.visible = true;     // 指向 DragViewBox_1 下的 dropbox
this.dropbox_2.visible = true;   // 指向 DragViewBox_2 下的 dropbox
```

---

## 五、维护提醒

1. **添加新组件时**，如果 sdk_baiya runtime 会通过硬编码的 `getChildByName('xxx')` 查找子节点，确保该子节点在 `exportChildren` 里写死 `name: 'xxx'`，或者在 ElementToolbar 创建时显式赋值 `element.name = 'xxx'`。
2. **不要在编辑器里用 `element.name` 做跨父节点查找**。当前没有这样的代码，将来也别加。需要查找时用 `element.id`。
3. **var 的生成依赖 element.name 作为 base**，所以即使 name 只局部唯一，多个同名元素进入 needsVarSet 时 var 仍会自动加后缀（`xxx`、`xxx_2`、`xxx_3`），不会冲突。
4. **拖拽相关组件**（DragViewBox / DragDropBox / DragDragBox / DragObj / DropObj）在导出时有 var/name 互斥逻辑，改这些组件的 meta 时注意 [exportProject.ts](../src/utils/exportProject.ts) 里的特殊分支。
