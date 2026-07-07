# setElementParent z-order 同步修正设计文档

**日期**：2026-06-03  
**作者**：Claude  
**状态**：设计阶段

## 背景

在 ElementList 中将元素拖入容器后，`parentId` 被正确更新，但元素在 `page.elements` 数组中的位置没有调整，导致 z-order 错误。

**复现场景**：
1. 新建翻页组件
2. 拖图片到画布（自动创建图片组件，位于数组末尾，z-order 最高）
3. 在 ElementList 中拖图片组件到翻页组件的 ContainerBox
4. **问题**：视觉上图片在容器内，ElementList 显示也正确，但点击画布任何地方都选中图片（因为它仍在数组末尾，z-order 最高）

**根本原因**：`setElementParent` 只更新 `parentId` 和坐标偏移，没有调整元素在 `page.elements` 数组中的位置。

## 设计目标

在 `setElementParent` 中，更新 `parentId` 的同时，调整元素在 `page.elements` 数组中的位置，确保：
1. **子元素排在父容器之后**（数组索引更大，z-order 更高，渲染在父容器上层）
2. **保持同一容器所有子元素的相对顺序**（不因新元素拖入而打乱现有子元素顺序）

## 设计方案

修改 `src/store/editorStore.ts` 的 `setElementParent` 函数（第 1060-1094 行）。

### 核心逻辑

在更新 `element.parentId` 之后，新增数组位置调整逻辑：

```ts
// 现有逻辑：
element.parentId = newParentId || undefined;

// [新增] 调整数组位置
if (newParentId) {
  // 1. 找到父容器在数组中的索引
  const parentIdx = page.elements.findIndex(e => e.id === newParentId);
  
  // 2. 找到该容器的所有现有子元素（不包括当前元素）
  const siblings = page.elements.filter(e => 
    e.parentId === newParentId && e.id !== id
  );
  
  // 3. 确定插入位置
  let insertIdx;
  if (siblings.length > 0) {
    // 有子元素：插在最后一个子元素之后
    const lastSibling = siblings[siblings.length - 1];
    insertIdx = page.elements.findIndex(e => e.id === lastSibling.id) + 1;
  } else {
    // 无子元素：插在父容器紧邻的下一个位置
    insertIdx = parentIdx + 1;
  }
  
  // 4. 调整数组：先移除，再插入
  const currentIdx = page.elements.findIndex(e => e.id === id);
  const [removed] = page.elements.splice(currentIdx, 1);
  // 如果插入位置在移除位置之后，移除操作会让插入索引向前偏移 1
  if (insertIdx > currentIdx) insertIdx--;
  page.elements.splice(insertIdx, 0, removed);
}
// 注意：newParentId 为 undefined（移出容器变为顶级）时不调整位置
```

### 示例场景

**场景 1：容器已有子元素**
```
原数组: [A, B, 容器P, P的子1, P的子2, C, D]
       索引 0  1   2      3      4     5  6

把 D 拖入 P：
1. parentIdx = 2
2. siblings = [子1, 子2]
3. lastSibling = 子2，索引 4
4. insertIdx = 4 + 1 = 5
5. currentIdx = 6
6. 移除 D（索引 6）
7. insertIdx > currentIdx 为 false，不调整
8. 插入 D 到索引 5

结果: [A, B, 容器P, P的子1, P的子2, D, C]
      索引 0  1   2      3      4     5  6
```

**场景 2：容器无子元素**
```
原数组: [A, B, 容器P, C, D]
       索引 0  1   2     3  4

把 D 拖入 P：
1. parentIdx = 2
2. siblings = []（无子元素）
3. insertIdx = parentIdx + 1 = 3
4. currentIdx = 4
5. 移除 D（索引 4）
6. insertIdx < currentIdx，不调整
7. 插入 D 到索引 3

结果: [A, B, 容器P, D, C]
      索引 0  1   2     3  4
```

**场景 3：前面元素拖入后面容器（需要索引调整）**
```
原数组: [A, 容器P, P的子1, C]
       索引 0   1      2     3

把 A 拖入 P：
1. parentIdx = 1
2. siblings = [子1]
3. lastSibling = 子1，索引 2
4. insertIdx = 2 + 1 = 3
5. currentIdx = 0
6. 移除 A（索引 0）
   数组变为: [容器P, P的子1, C]
7. insertIdx (3) > currentIdx (0)，调整：insertIdx = 3 - 1 = 2
8. 插入 A 到索引 2

结果: [容器P, P的子1, A, C]
      索引  0      1     2  3
```

### Why：索引偏移调整

当 `insertIdx > currentIdx` 时，移除操作会让插入位置向前偏移 1：
- 移除元素后，数组长度减 1
- 移除位置之后的所有元素索引都减 1
- 所以插入索引也要减 1

### 边界情况处理

| 情况 | 处理 |
|---|---|
| 容器无子元素 | 插入到父容器紧邻的下一个位置（`parentIdx + 1`） |
| 元素移出容器（`newParentId = undefined`） | 不调整数组位置，保持当前位置 |
| 元素在移除位置之前 | 插入索引需要减 1 |
| 元素在移除位置之后 | 插入索引不变 |

## 不在范围内

- 多个元素同时拖入容器的批量操作（当前只处理单个元素）
- `reorderElement` 的 z-order 逻辑（已有正确实现）
- 容器嵌套层级限制（已有循环检测，不在本次修改范围）

## 验证场景

| # | 场景 | 预期结果 |
|---|---|---|
| 1 | 新建元素（数组末尾）拖入容器 | 元素移到容器所有子元素之后，点击画布不再优先选中该元素 |
| 2 | 容器无子元素时拖入第一个子元素 | 元素紧邻父容器之后 |
| 3 | 容器已有子元素时拖入新子元素 | 新子元素排在所有现有子元素之后，现有子元素顺序不变 |
| 4 | 数组前面的元素拖入后面的容器 | 元素移到正确位置，索引偏移计算正确 |
| 5 | 元素从容器 A 移到容器 B | 元素从 A 的子元素列表移出，加入 B 的子元素列表末尾 |

## 实现文件

**修改文件**：
- `src/store/editorStore.ts:1060-1094` — `setElementParent` 函数

**无需新增文件**

## 风险与注意事项

**风险**：数组操作（splice）的索引计算错误可能导致元素丢失或重复。

**缓解**：
1. 先 `splice(currentIdx, 1)` 移除并保存元素
2. 计算插入索引偏移
3. 再 `splice(insertIdx, 0, element)` 插入元素
4. 验证场景覆盖前后位置关系的所有组合

**注意**：`newParentId = undefined` 时不调整位置，保持向后兼容（元素移出容器变为顶级时，用户可能期望保持当前位置）。
