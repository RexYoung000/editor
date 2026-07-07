# 拖拽题（DragViewBox）UX 优化设计

日期：2026-05-17
范围：减少非技术用户（教师）配置「拖拽题」时需手动设置的字段；统一 DragObj/DropObj 的图片加载与尺寸联动行为。

## 背景

[2026-05-16-dragviewbox-design.md](2026-05-16-dragviewbox-design.md) 已实现 DragViewBox 拖拽题的基础结构与导出。但教师创建拖拽题后，属性面板暴露的字段对非技术人员认知负担过重：

- DragViewBox 7 个交互开关（mode、dropNotice、clickPlace、changePos、backToInitPos、backAni、autoSorting）
- DragObj/DropObj：name（自动生成不需要手改）、cusAttribute（技术字段）、group、pivotX/Y、parentId
- DragObj 子 Image 的 skin 必须展开子节点才能设置
- 「正确目标」下拉列出全页所有 DropObj，跨 DragViewBox 混在一起

本设计在不破坏 .scene 导出格式、不动 sdk_baiya 运行时的前提下，通过元数据标记 + PropertyPanel 渲染条件 + store action 联动，让教师只需设置图片和「正确目标」两个核心字段。

## 设计目标

1. 教师创建拖拽题后，DragObj/DropObj 默认空状态（无子 Image，无尺寸假设）
2. 填入「图片」即生成子 Image，并按图片实际尺寸自动调整父容器（DragObj/DropObj）尺寸
3. 教师不需要碰：name、parentId、cusAttribute、pivotX/Y
4. 「正确目标」下拉只列同一 DragViewBox 内的 DropObj
5. 容器级配置（DragViewBox 7 个开关）默认折叠
6. 所有自动行为走 store action，撤销栈原子

## 五个改动单元

### 1. 隐藏字段 + DragObj 命名规则

**PropertyPanel 隐藏规则：**

| 元素类型 | 隐藏字段 | 原因 |
|---------|---------|------|
| DropObj | name 输入框 | 自动 dj1, dj2... |
| DragObj | name 输入框 | 自动 aj1, aj2... |
| DragViewBox / DragDropBox / DragDragBox / DragObj / DropObj | 父容器下拉 | 结构固定 |

**实现位置：**
- `src/components/PropertyPanel.tsx` 的 name 输入框区域 + 父容器下拉区域，加类型黑名单条件渲染

**命名规则改动：**
- `src/components/ElementToolbar.tsx` 的 `handleAddDragGame`：默认 DragObj `name = 'aj1'`、`var = 'aj1'`
- `src/store/editorStore.ts` 的 `addDragObj`：递增命名 `aj${n}`、`var = aj${n}`
- 注意：旧代码若有 `a1` 字符串引用需排查（搜 `'a1'` 字面量）

**成本**：低；**风险**：无

---

### 2. DragViewBox 容器属性折叠为「高级设置」

**PropertyDef 扩展：**
```ts
export interface PropertyDef {
  // ...existing
  advanced?: boolean;  // true: 默认折叠在「高级设置」
}
```

**PropertyPanel 渲染：**
- 把 `advanced: true` 字段从普通 properties 列表中分离
- 末尾追加可展开的「高级设置」折叠区，默认收起
- 已有「拖拽组件管理」section 不受影响

**DragViewBox 标记：**
- 保留 `mode`（放置模式）为常规字段
- `dropNotice / clickPlace / changePos / backToInitPos / backAni / autoSorting` 标 `advanced: true`

**成本**：低；**风险**：无

---

### 3. pivotX/Y 自动居中（创建时 + 尺寸变化时同步）

**创建时：**
- `addDropObj` / `addDragObj` / `handleAddDragGame` 在创建后写入 `pivotX = width / 2, pivotY = height / 2`
- 因为初始没有 Image（见方案 5），DragObj/DropObj 的初始默认尺寸用 elementMeta 的 `defaultSize`（参考 .scene 用 258×187），pivot 据此计算

**尺寸变化时（联动方案 5）：**
- 当方案 5 的 store action 因加载图片调整父容器宽高时，同一 action 同步更新 pivotX/Y = 新宽高 / 2
- 用户手动调整宽高时，pivot 不自动跟随（避免破坏用户意图）；若用户希望重新居中，可走属性面板的 advanced 区域手动改

**字段标记：**
- DragObj/DropObj 的 `pivotX, pivotY` 标 `advanced: true`

**成本**：低；**风险**：无

---

### 4. 「正确目标」下拉范围限制为同一 DragViewBox

**PropertyDef 扩展：**
```ts
export interface PropertyDef {
  // ...existing
  scopedToAncestorType?: string;  // elementRef 类型限定：只列举此祖先类型子树下符合 elementFilter 的元素
}
```

**DragObj 配置：**
- `rightDropObjName` 字段加 `scopedToAncestorType: 'DragViewBox'`

**FieldRenderer elementRef 渲染（`src/components/FieldRenderer.tsx` 第 396-426 行）：**
- 现状：candidates = 全页所有 DropObj
- 改为：
  1. 找当前 DragObj 向上的 DragViewBox 祖先（递归 parentId 直到 type === 'DragViewBox'）
  2. 收集该 DragViewBox 子树下所有元素，过滤 type === 'DropObj'
  3. 显示项保持当前格式 `{el.name}`（已实现）

**异常处理：**
- 找不到 DragViewBox 祖先：列空（不应该发生，因为 DragObj 必在 DragViewBox 内）
- 当前选中元素不是 DragObj 类型：按现有 `elementFilter` 行为（不限定祖先）

**成本**：低；**风险**：无

---

### 5. DragObj / DropObj 代理子 Image 的 skin（核心）

DragObj 与 DropObj 行为完全一致：

**创建时：**
- 不带子 Image（handleAddDragGame 不再创建 DragObj 的子 Image）
- 父容器宽高用 elementMeta 默认值（258×187，对齐参考 .scene）

**填入「图片」时（核心 store action `setProxySkin(parentId, skinValue)`）：**
1. 创建子 Image 元素，`parentId = 父 DragObj/DropObj.id`，`locked: true`，`skin = skinValue`
2. 异步加载图片读取实际宽高（用 `new window.Image()` 的 onload，或读 data URL/uploads 文件）
3. 加载完成后，在同一个 set 调用中（保证撤销原子）：
   - 父容器 `width = imgW, height = imgH`
   - 父容器 `pivotX = imgW / 2, pivotY = imgH / 2`
   - 子 Image `x = 0, y = 0, width = imgW, height = imgH`
4. 失败（图片加载错误）：保留子 Image 与原 skin 字符串，父尺寸不变；控制台 warn

**清空「图片」时：**
1. 找到该父容器下第一个子 Image（locked），删除它
2. 父容器宽高保持当前值（用户可手动改）
3. 父容器 pivot 保持当前值

**修改已有「图片」时：**
- 复用同一个 `setProxySkin` action：找到现有子 Image → 改 skin → 重新加载 → 调整尺寸

**PropertyDef 元数据：**
```ts
export interface ProxyChildProp {
  childType: string;       // 子元素 type，如 'Image'
  childProp: string;       // 子元素 prop，如 'skin'
  autoResizeParent?: boolean;  // 加载后调整父容器尺寸
}
export interface Meta {
  // ...existing
  proxyChildProps?: Record<string, ProxyChildProp>;  // key 是 PropertyDef.key
}
```

**DragObj/DropObj 配置：**
```ts
proxyChildProps: {
  skin: { childType: 'Image', childProp: 'skin', autoResizeParent: true }
}
```

并在 properties 中加 `{ key: 'skin', label: '图片', type: 'file', group: '外观' }`（这里 `skin` 不是父容器自身字段，而是 PropertyPanel 通过 proxyChildProps 路由到子 Image 的虚拟字段）。

**PropertyPanel 路由：**
- 渲染时检测 PropertyDef.key 在 `meta.proxyChildProps` 中：
  - 读：从父元素的子节点找 `childType === 'Image'`，返回其 `props[childProp]`，找不到返回空字符串
  - 写：调用 store action `setProxySkin(parentId, value)`（统一处理创建/更新/删除）

**子 Image 的隐藏：**
- 元素列表（ElementList）中，若元素 `parentId` 对应 DragObj/DropObj 且 `type === 'Image'` 且 `locked: true`，跳过渲染
- 用户感知不到这层 Image，避免「为什么 DragObj 下面有个奇怪的 Image」的困惑

**对 .scene 导出的影响：**
- 子 Image 已存在于 element 树中，`buildSceneNode` 自然递归输出
- 父容器宽高 = 图片实际宽高
- 子 Image 宽高 = 父宽高（铺满）
- locked 字段不参与导出

**异步加载的竞态：**
- 用户连续改两次「图片」，先后触发两个加载
- 用 element id + 加载序号标记每次加载，回调时校验当前 element 的 skin 仍是本次加载的 url，否则丢弃结果（避免后写盖前的旧结果）
- 实现：在 element.props 上记录 `_skinLoadToken: number`，每次 setProxySkin 递增；onload 回调对比 token 一致才写入

**成本**：中；**风险**：异步竞态、加载失败处理

---

### cusAttribute / cusAttribute1 处理

- 保留为 elementMeta 普通字段
- 标 `advanced: true`，默认折叠
- 不做自动配对（技术人员需要时自己填）

---

## 不在本期范围

- 复合元素 DragQuestion（一次性配对生成 DragObj+DropObj 并自动配对）
- 拖动连线 UI（左右连线选择正确目标）
- 自动配对 cusAttribute（rightDropObjName → cusAttribute 联动）

## 校验方案

实现完成后的验证步骤：

1. 「豌豆口才」tab → 「拖拽题」 → 默认结构创建：DragViewBox + dropbox(空) + dragbox(空)，DropObj name=dj1，DragObj name=aj1（旧值 a1 不再使用）
2. 选中 DragObj：属性面板看不到 name 输入和父容器下拉；看到「图片」file 字段
3. 填入「图片」：DragObj 自动添加子 Image，宽高变成图片实际尺寸，pivot 居中
4. 清空「图片」：子 Image 消失，DragObj 宽高保持
5. DropObj 同上
6. 选中 DragViewBox：属性面板默认只显「放置模式」，其余 6 项收在「高级设置」
7. DragObj 的「正确目标」下拉：只列当前 DragViewBox 内的 DropObj name
8. 撤销/重做：尺寸调整/子 Image 创建/删除都能整体撤销
9. 同一页面有两个 DragViewBox 时，A 的 DragObj 选不到 B 的 DropObj
10. 导出 .scene：DragObj/DropObj 节点宽高为图片实际尺寸，子 Image 节点正确写出
