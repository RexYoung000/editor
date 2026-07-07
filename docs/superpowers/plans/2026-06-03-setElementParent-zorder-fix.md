# setElementParent z-order 同步修正实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正 setElementParent 函数，在更新 parentId 的同时调整元素在数组中的位置，保证 z-order 正确

**Architecture:** 在 setElementParent 中，更新 parentId 后新增数组位置调整逻辑：找到父容器和现有子元素，计算插入位置（所有子元素之后），先移除再插入，处理索引偏移。

**Tech Stack:** TypeScript, Zustand (immer middleware)

---

## 文件清单

**修改文件：**
- `src/store/editorStore.ts` — `setElementParent` 函数（第 1060-1094 行）

**无需新增文件**

---

### 任务 1：修正 setElementParent 的 z-order 同步

**Files:**
- Modify: `src/store/editorStore.ts:1060-1094`

**目标：** 在 `element.parentId = newParentId || undefined;` 之后，新增数组位置调整逻辑

- [ ] **步骤 1: 读取当前 setElementParent 函数**

运行：直接读取 `src/store/editorStore.ts:1060-1094`

预期：看到 `element.parentId = newParentId || undefined;` 在第 1092 行

- [ ] **步骤 2: 在 parentId 赋值后新增数组位置调整代码**

修改 `src/store/editorStore.ts` 第 1092 行之后，在 `get().saveHistory();` 之前插入：

**在第 1092 行 `element.parentId = newParentId || undefined;` 之后插入：**

```ts
        // [新增] 调整数组位置：子元素排在父容器所有现有子元素之后
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
```

**完整的修改后代码段（1088-1094 行 + 新增）：**

```ts
        const oldOff = getAncestorOffset(element.parentId);
        const newOff = getAncestorOffset(newParentId);
        element.x += oldOff.ax - newOff.ax;
        element.y += oldOff.ay - newOff.ay;
        element.parentId = newParentId || undefined;
        
        // [新增] 调整数组位置：子元素排在父容器所有现有子元素之后
        if (newParentId) {
          const parentIdx = page.elements.findIndex(e => e.id === newParentId);
          const siblings = page.elements.filter(e => 
            e.parentId === newParentId && e.id !== id
          );
          let insertIdx;
          if (siblings.length > 0) {
            const lastSibling = siblings[siblings.length - 1];
            insertIdx = page.elements.findIndex(e => e.id === lastSibling.id) + 1;
          } else {
            insertIdx = parentIdx + 1;
          }
          const currentIdx = page.elements.findIndex(e => e.id === id);
          const [removed] = page.elements.splice(currentIdx, 1);
          if (insertIdx > currentIdx) insertIdx--;
          page.elements.splice(insertIdx, 0, removed);
        }
        
        get().saveHistory();
```

- [ ] **步骤 3: 验证语法无误**

运行：`pnpm lint src/store/editorStore.ts`

预期：无 ESLint 错误

- [ ] **步骤 4: 测试场景 1 - 新建元素拖入容器**

操作：
1. 启动开发服务器：`pnpm dev`（如果尚未启动）
2. 新建翻页组件
3. 拖图片到画布（自动创建图片组件，位于数组末尾）
4. 在 ElementList 中拖图片组件到翻页组件的 ContainerBox
5. 点击画布的翻页组件区域

预期：选中翻页组件，不再总是选中图片（图片已不在数组末尾）

- [ ] **步骤 5: 测试场景 2 - 容器无子元素时拖入第一个子元素**

操作：
1. 创建一个容器（如 Box）
2. 创建一个顶级元素（如 Image）
3. 在 ElementList 中拖该元素到容器中
4. 检查 ElementList 中该元素紧邻容器之后

预期：元素在 ElementList 中紧邻父容器之后显示

- [ ] **步骤 6: 测试场景 3 - 容器已有子元素时拖入新子元素**

操作：
1. 创建一个容器 P
2. 拖入子元素 A
3. 拖入子元素 B
4. 检查 ElementList 中顺序：容器P → 子A → 子B

预期：新子元素排在所有现有子元素之后，现有子元素顺序不变

- [ ] **步骤 7: 测试场景 4 - 数组前面的元素拖入后面的容器**

操作：
1. 创建元素 A（数组靠前）
2. 创建容器 P（数组靠后）
3. 拖入子元素到 P（让 P 有子元素）
4. 在 ElementList 中拖 A 到容器 P 中
5. 检查 A 是否正确排在 P 的所有子元素之后

预期：A 移到正确位置，索引偏移计算正确（insertIdx 减 1）

- [ ] **步骤 8: 测试场景 5 - 元素从容器 A 移到容器 B**

操作：
1. 创建容器 A 和容器 B
2. 拖元素 X 到容器 A
3. 在 ElementList 中拖元素 X 从 A 到 B
4. 检查 X 是否在 B 的子元素列表末尾

预期：X 从 A 的子元素列表移出，加入 B 的子元素列表末尾

- [ ] **步骤 9: 提交改动（注意：用户要求不自动提交 git，此步骤仅作记录，实际执行时跳过提交）**

```bash
# 仅作记录，实际不执行
# git add src/store/editorStore.ts
# git commit -m "fix: 修正 setElementParent 的 z-order 同步"
```

---

## 自查清单

**Spec 覆盖检查：**
- ✅ 核心逻辑：数组位置调整（找父容器 → 找子元素 → 计算插入位置 → 移除插入）
- ✅ 索引偏移调整：`if (insertIdx > currentIdx) insertIdx--;`
- ✅ 边界情况：容器无子元素、newParentId 为 undefined
- ✅ 5 个验证场景全部覆盖

**占位符扫描：**
- ✅ 无 TBD / TODO / "实现后续" 等占位符
- ✅ 所有代码块都是完整的可执行代码

**类型一致性：**
- ✅ `page.elements` 在所有步骤中一致
- ✅ `findIndex` / `filter` / `splice` 方法使用一致
- ✅ 变量命名一致：`parentIdx`, `siblings`, `insertIdx`, `currentIdx`

**测试覆盖：**
- ✅ 步骤 4-8 覆盖设计文档中的 5 个验证场景

---

## 注意事项

**重要：** 用户明确要求"不自动提交 git"，步骤 9 的 git 命令仅作记录，实际执行时跳过提交操作。

**数组操作风险：** splice 的索引计算错误可能导致元素丢失或重复。务必按照步骤 2 的代码精确执行，先移除再插入，处理索引偏移。

**测试重点：** 步骤 4 是核心场景（复现用户报告的 bug），必须验证通过。步骤 7 验证索引偏移计算（`insertIdx > currentIdx` 分支）。
