# DragViewBox UX 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让教师配置「拖拽题」时只需设置图片和「正确目标」两个核心字段，其他自动化处理。

**Architecture:** 通过元数据扩展 (`advanced` / `scopedToAncestorType` / `proxyChildProps`) + PropertyPanel 渲染条件 + store action 联动。导出 .scene 格式不变。

**Tech Stack:** TypeScript, React, Zustand (immer), LayaAir 2.x runtime

**Spec:** `docs/superpowers/specs/2026-05-17-dragviewbox-ux-design.md`

**Note:** 本项目无测试框架。每个 Task 以 `pnpm build` 验证 TS 编译。最终以 dev server 手动验证。用户自行审查后手动 git commit。

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/elements/elementMeta.ts` | 扩展 PropertyDef (advanced, scopedToAncestorType)，扩展 Meta (proxyChildProps)；DragObj/DropObj 字段标 advanced，加 skin 代理字段；rightDropObjName 加 scopedToAncestorType |
| Modify | `src/components/PropertyPanel.tsx` | name 输入和父容器下拉对拖拽题元素隐藏；properties 渲染按 advanced 分折叠区；proxy skin 路由到 store action |
| Modify | `src/components/FieldRenderer.tsx` | elementRef 渲染时支持 scopedToAncestorType 过滤 |
| Modify | `src/components/ElementList.tsx` | 隐藏 locked 子 Image 节点（在拖拽题下） |
| Modify | `src/components/ElementToolbar.tsx` | handleAddDragGame：DragObj 默认 name 改为 aj1，不再创建子 Image |
| Modify | `src/store/editorStore.ts` | addDragObj 命名改为 `aj${n}`，不创建子 Image；新增 setProxySkin action（异步加载图片，调整父尺寸） |

---

### Task 1: 扩展 PropertyDef 与 Meta 类型，DragObj 命名改为 aj{n}

**Files:**
- Modify: `src/elements/elementMeta.ts:3-12` (PropertyDef 接口)
- Modify: `src/elements/elementMeta.ts:21-47` (Meta 接口)
- Modify: `src/elements/elementMeta.ts:178-179` (DragObj/DropObj 条目)
- Modify: `src/store/editorStore.ts:1438,1443` (addDragObj 命名)
- Modify: `src/components/ElementToolbar.tsx:247-252` (handleAddDragGame DragObj 命名 + 不创建子 Image)

- [ ] **Step 1: 扩展 PropertyDef 接口**

`src/elements/elementMeta.ts` 第 3-12 行替换为：

```ts
export interface PropertyDef {
  key: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'color' | 'select' | 'slider' | 'boolean' | 'file' | 'elementRef' | 'spineFolder';
  group?: string;
  defaultValue?: unknown;
  options?: { label: string; value: unknown }[];
  min?: number; max?: number; step?: number;
  elementFilter?: string[]; // elementRef 类型：只显示这些 layaType 的元素
  /** elementRef 类型：限定候选范围为指定类型祖先的子树（如 'DragViewBox' 限定为同一 DragViewBox 内的元素） */
  scopedToAncestorType?: string;
  /** 标记为高级字段：默认折叠在「高级设置」区，不在主属性面板显示 */
  advanced?: boolean;
}
```

- [ ] **Step 2: 扩展 Meta 接口加 proxyChildProps**

在 `src/elements/elementMeta.ts` 的 `Meta` 接口中（约第 47 行 `varFromName?: boolean;` 后），添加：

```ts
  /** 子元素属性代理：把父元素属性面板上的某字段路由到子元素的某属性。
   *  例如 DragObj 的「图片」字段写入第一个子 Image 的 skin。
   *  - childType: 子元素的 type
   *  - childProp: 子元素的 prop key
   *  - autoResizeParent: 加载图片后调整父元素尺寸到图片实际宽高 */
  proxyChildProps?: Record<string, { childType: string; childProp: string; autoResizeParent?: boolean }>;
```

- [ ] **Step 3: 替换 DragObj 条目**

找到 `src/elements/elementMeta.ts` 中现有的 `DragObj:` 行（约 line 178）。替换为：

```ts
  DragObj:      { layaType: 'DragObj',     label: '拖拽对象', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 258, height: 187 }, varFromName: true, defaultProps: { hasDrop: 'false', group: '-1', filterColor: '#ffff00', filterBlur: 6, canSelect: 'false' }, proxyChildProps: { skin: { childType: 'Image', childProp: 'skin', autoResizeParent: true } }, properties: [{ key: 'skin', label: '图片', type: 'file', group: '外观' }, { key: 'rightDropObjName', label: '正确目标', type: 'elementRef', group: '交互', elementFilter: ['DropObj'], scopedToAncestorType: 'DragViewBox' }, { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互', advanced: true }, { key: 'group', label: '分组', type: 'text', group: '交互', advanced: true }, { key: 'hasDrop', label: '已放置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'canSelect', label: '可选中', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'canOverlayDrop', label: '可重叠', type: 'boolean', group: '交互', advanced: true }, { key: 'isMoveEvent', label: '可移动', type: 'boolean', group: '交互', advanced: true }, { key: 'filterColor', label: '滤镜颜色', type: 'color', group: '外观', advanced: true }, { key: 'filterBlur', label: '滤镜模糊', type: 'number', min: 0, max: 20, group: '外观', advanced: true }, { key: 'pivotX', label: '轴心X', type: 'number', group: '外观', advanced: true }, { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观', advanced: true }] },
```

- [ ] **Step 4: 替换 DropObj 条目**

```ts
  DropObj:      { layaType: 'DropObj',     label: '放置区域', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 258, height: 187 }, varFromName: true, defaultProps: { hasDrop: 'false', group: '-1', isNeedTip: false, noticeColor: '#ff0000', noticeBlur: 4 }, proxyChildProps: { skin: { childType: 'Image', childProp: 'skin', autoResizeParent: true } }, properties: [{ key: 'skin', label: '图片', type: 'file', group: '外观' }, { key: 'cusAttribute', label: '自定义属性', type: 'text', group: '交互', advanced: true }, { key: 'group', label: '分组', type: 'text', group: '交互', advanced: true }, { key: 'hasDrop', label: '已放置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'isNeedTip', label: '显示提示', type: 'boolean', group: '交互', advanced: true }, { key: 'showNotice', label: '提示边框', type: 'boolean', group: '外观', advanced: true }, { key: 'noticeColor', label: '提示颜色', type: 'color', group: '外观', advanced: true }, { key: 'noticeBlur', label: '提示模糊', type: 'number', min: 0, max: 20, group: '外观', advanced: true }, { key: 'pivotX', label: '轴心X', type: 'number', group: '外观', advanced: true }, { key: 'pivotY', label: '轴心Y', type: 'number', group: '外观', advanced: true }] },
```

- [ ] **Step 5: 标记 DragViewBox 容器交互字段为 advanced**

找到 `DragViewBox:` 那一行，把除了 `mode` 之外的 6 个字段（dropNotice, clickPlace, changePos, backToInitPos, backAni, autoSorting）每个都加 `advanced: true`。

完整替换 DragViewBox 条目为：

```ts
  DragViewBox:  { layaType: 'DragViewBox', label: '拖拽容器', category: 'speechCourse', toolbarHidden: true, defaultSize: { width: 1920, height: 1080 }, defaultPosition: { x: 0, y: 0 }, defaultProps: { mode: 1, successPosMode: 0, dropNotice: 'true', clickPlace: 'false', changePos: 'true', backToInitPos: 'true', backAni: 'true', autoSorting: 'true' }, properties: [{ key: 'mode', label: '放置模式', type: 'select', group: '交互', options: [{ label: '鼠标位', value: 0 }, { label: '放置位', value: 1 }, { label: '自定义', value: 2 }, { label: '自动排列', value: 3 }] }, { key: 'dropNotice', label: '放置提示', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'clickPlace', label: '点击放置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'changePos', label: '改变位置', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'backToInitPos', label: '失败返回', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'backAni', label: '返回动画', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }, { key: 'autoSorting', label: '自动排序', type: 'select', group: '交互', advanced: true, options: [{ label: '是', value: 'true' }, { label: '否', value: 'false' }] }] },
```

- [ ] **Step 6: 改 addDragObj 命名为 aj{n}**

`src/store/editorStore.ts` 第 1438 行 `newEl.name = \`a${n}\`;` 改为：

```ts
            newEl.name = `aj${n}`;
```

第 1443 行 `newEl.props = { ...newEl.props, var: \`a${n}\` };` 改为：

```ts
            newEl.props = { ...newEl.props, var: `aj${n}` };
```

- [ ] **Step 7: 改 addDragObj 不创建子 Image**

继续在 `addDragObj` 中，找到创建子 Image 的代码块（约 line 1458-1470，从 `// 创建子 Image` 注释或 `const img = createDefaultElement('Image');` 开始，到 `if (imgObj) registerObject(img.id, imgObj);` 结束）。**整个删除**。

`return;` 上面只保留 DragObj 自身的创建逻辑：

```ts
            const obj = createLayaComponent(newEl);
            if (obj) registerObject(newEl.id, obj);
            return;
          }
        }
      },
```

- [ ] **Step 8: 改 handleAddDragGame DragObj 命名 + 不创建子 Image**

`src/components/ElementToolbar.tsx` 第 247 行 `dragObj.name = 'a1';` 改为：

```ts
    dragObj.name = 'aj1';
```

第 251 行 `dragObj.props = { ...dragObj.props, var: 'a1' };` 改为：

```ts
    dragObj.props = { ...dragObj.props, var: 'aj1' };
```

然后找到创建子 Image 的代码块（在 dragObj 创建后、`const allEls = [...]` 之前），整个删除：

```ts
    const img = createDefaultElement('Image');
    img.name = '';
    img.parentId = dragObj.id;
    img.x = 7.5; img.y = 6;
    img.width = dragObj.width - 15; img.height = dragObj.height - 12;
    img.props = { skin: '' };
```

并把 `const allEls = [dvb, dropbox, dragbox, dropObj, dragObj, img];` 改为：

```ts
    const allEls = [dvb, dropbox, dragbox, dropObj, dragObj];
```

- [ ] **Step 9: 验证编译**

Run: `pnpm build`
Expected: 编译通过（我们改的文件无 TS 错误；其他文件原有错误不在此次修改范围）。

---

### Task 2: PropertyPanel 隐藏字段 + advanced 折叠区

**Files:**
- Modify: `src/components/PropertyPanel.tsx:197-296` (隐藏 name 输入)
- Modify: `src/components/PropertyPanel.tsx:346-375` (隐藏父容器下拉)
- Modify: `src/components/PropertyPanel.tsx:504-533` (properties 按 advanced 分组渲染)

- [ ] **Step 1: 定义拖拽题元素类型常量**

在 `src/components/PropertyPanel.tsx` 文件顶部 import 后（约 line 20 附近）添加：

```ts
const DRAG_GAME_TYPES = ['DragViewBox', 'DragDropBox', 'DragDragBox', 'DragObj', 'DropObj'];
const DRAG_GAME_NAME_HIDDEN = ['DragObj', 'DropObj'];
```

- [ ] **Step 2: 隐藏 name 输入框**

在 `{/* 名称 */}` 那个 IIFE（约 line 197-296）的最外层条件 `{single && (() =>` 中加上类型判断。把：

```tsx
              {/* 名称 */}
              {single && (() => {
```

改为：

```tsx
              {/* 名称 */}
              {single && !DRAG_GAME_NAME_HIDDEN.includes(single.type) && (() => {
```

- [ ] **Step 3: 隐藏父容器下拉**

找到 `{/* 父容器 */}` 块（约 line 346）的条件 `{single && (`，改为：

```tsx
              {/* 父容器 */}
              {single && !DRAG_GAME_TYPES.includes(single.type) && (
```

- [ ] **Step 4: properties 按 advanced 分组渲染**

替换 `src/components/PropertyPanel.tsx` 第 505-533 行的整个组件属性渲染块：

```tsx
              {/* 组件属性（按 group 分组，advanced 字段单独折叠） */}
              {properties.length > 0 && (() => {
                const normalProps = properties.filter(p => !p.advanced);
                const advancedProps = properties.filter(p => p.advanced);
                const groups = new Map<string, typeof properties>();
                normalProps.forEach((f) => {
                  const g = f.group || t('properties');
                  if (!groups.has(g)) groups.set(g, []);
                  groups.get(g)!.push(f);
                });
                const isInputImage = meta?.layaType === 'KlInputImage';
                if (isInputImage && !groups.has('交互')) groups.set('交互', []);
                const renderField = (field: PropertyDef) => {
                  const propDefault = single ? (elementMeta[single.type]?.defaultProps as Record<string, unknown> | undefined)?.[field.key] : undefined;
                  const numDefault = typeof propDefault === 'number' ? propDefault : undefined;
                  return <FieldRenderer key={field.key} field={field} elements={selectedElements} onChange={handleChange} propDefault={numDefault} />;
                };
                return (
                  <>
                    {Array.from(groups.entries()).map(([groupName, fields]) => (
                      <div key={groupName} className="mb-2 pb-2 border-b border-slate-700">
                        <div className="text-xs text-slate-500 mb-1.5">{groupName}</div>
                        {fields.map(renderField)}
                        {isInputImage && groupName === '交互' && (
                          <button
                            onClick={() => setBindKeyboardOpen(true)}
                            className="w-full mt-1.5 py-1.5 text-xs bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded text-blue-200"
                          >
                            绑定键盘
                          </button>
                        )}
                      </div>
                    ))}
                    {advancedProps.length > 0 && (
                      <details className="mb-2 pb-2 border-b border-slate-700">
                        <summary className="text-xs text-slate-500 mb-1.5 cursor-pointer hover:text-slate-300 select-none">高级设置</summary>
                        <div className="mt-1.5">
                          {advancedProps.map(renderField)}
                        </div>
                      </details>
                    )}
                  </>
                );
              })()}
```

- [ ] **Step 5: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 3: FieldRenderer 支持 scopedToAncestorType

**Files:**
- Modify: `src/components/FieldRenderer.tsx:396-426` (elementRef case)

- [ ] **Step 1: 在 elementRef case 中按 scopedToAncestorType 过滤候选**

`src/components/FieldRenderer.tsx` 第 411-414 行的 candidates 过滤逻辑：

```ts
      const candidates = (page?.elements ?? []).filter(el => {
        if (!field.elementFilter) return true;
        return field.elementFilter.includes(el.type);
      });
```

替换为：

```ts
      const allElements: Element[] = page?.elements ?? [];
      // 当前选中元素（可能是单选；多选时不限定祖先范围，列出全部 candidates）
      const currentEl = elements.length === 1 ? elements[0] : null;
      // 找到指定祖先类型的元素 id（沿 parentId 向上）
      const findAncestorId = (startEl: Element | null, ancestorType: string): string | null => {
        let cur: Element | undefined = startEl ?? undefined;
        while (cur?.parentId) {
          const parent = allElements.find(e => e.id === cur!.parentId);
          if (!parent) return null;
          if (parent.type === ancestorType) return parent.id;
          cur = parent;
        }
        return null;
      };
      // 收集祖先 id 子树下的所有元素 id（递归）
      const collectDescendantIds = (rootId: string): Set<string> => {
        const ids = new Set<string>([rootId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const el of allElements) {
            if (el.parentId && ids.has(el.parentId) && !ids.has(el.id)) {
              ids.add(el.id);
              changed = true;
            }
          }
        }
        return ids;
      };
      const ancestorId = field.scopedToAncestorType && currentEl ? findAncestorId(currentEl, field.scopedToAncestorType) : null;
      const scopedIds = ancestorId ? collectDescendantIds(ancestorId) : null;
      const candidates = allElements.filter(el => {
        if (field.elementFilter && !field.elementFilter.includes(el.type)) return false;
        if (scopedIds && !scopedIds.has(el.id)) return false;
        return true;
      });
```

- [ ] **Step 2: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 4: ElementList 隐藏 locked 子 Image（拖拽题下）

**Files:**
- Modify: `src/components/ElementList.tsx` (元素树渲染)

- [ ] **Step 1: 修改 getChildren 函数**

`src/components/ElementList.tsx` 第 56 行：

```ts
  const getChildren = (parentId: string | undefined) => elements.filter(e => e.parentId === parentId);
```

替换为：

```ts
  const getChildren = (parentId: string | undefined) => elements.filter(e => {
    if (e.parentId !== parentId) return false;
    // 隐藏 DragObj/DropObj 下的 locked 子 Image（代理图片，不暴露给用户操作）
    if (e.type === 'Image' && e.locked && parentId) {
      const parent = elements.find(p => p.id === parentId);
      if (parent && (parent.type === 'DragObj' || parent.type === 'DropObj')) return false;
    }
    return true;
  });
```

- [ ] **Step 2: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 5: setProxySkin store action（核心：异步加载 + 调整尺寸）

**Files:**
- Modify: `src/store/editorStore.ts` (interface + 实现)

- [ ] **Step 1: 在 EditorState interface 中声明 action**

在 `src/store/editorStore.ts` 的 interface 中（addDragObj/removeDragObj 附近），添加：

```ts
  /** 设置父元素的代理子皮肤：自动创建/更新/删除子 Image，并按图片实际尺寸调整父元素宽高 */
  setProxySkin: (parentId: string, skinValue: string) => void;
```

- [ ] **Step 2: 添加辅助函数：异步加载图片读取宽高**

在 `editorStore.ts` 文件顶部（其他 import 后）添加：

```ts
async function loadImageSize(skin: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (!skin) { resolve(null); return; }
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    // 处理 uploads / data URL / 内置路径都可直接给 src
    img.src = skin;
  });
}
```

- [ ] **Step 3: 实现 setProxySkin action**

在 `removeDragObj` action 实现后面（在 `},` 之后，最后一个 `}))` 之前），添加：

```ts
      setProxySkin: (parentId: string, skinValue: string) => {
        const course = get().currentCourse;
        const subPageId = get().currentSubPageId;
        if (!course || !subPageId) return;

        // 找当前 page 与父元素
        const findParent = (): { page: SubPage; parent: Element } | null => {
          for (const stage of [...course.stages, ...(course.previewStages ?? [])]) {
            for (const page of stage.subPages) {
              if (page.id !== subPageId) continue;
              const parent = page.elements.find(e => e.id === parentId);
              if (parent) return { page, parent };
            }
          }
          return null;
        };
        const found = findParent();
        if (!found) return;
        const { page, parent } = found;

        // 找现有子 Image（locked）
        const existingImg = page.elements.find(e => e.parentId === parentId && e.type === 'Image' && e.locked);

        const trimmed = (skinValue ?? '').trim();

        // 清空：删除子 Image，父尺寸/pivot 保持
        if (!trimmed) {
          if (existingImg) {
            get().deleteElement(existingImg.id);
          }
          return;
        }

        // 递增加载 token，异步竞态防护
        const props = parent.props as Record<string, unknown>;
        const token = ((props._skinLoadToken as number) ?? 0) + 1;

        if (existingImg) {
          // 更新现有子 Image 的 skin（但宽高暂不动，等加载完成再调整）
          set((state) => {
            const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === subPageId);
            if (!sp) return state;
            const p = sp.elements.find(e => e.id === parentId);
            if (p) (p.props as Record<string, unknown>)._skinLoadToken = token;
            const img = sp.elements.find(e => e.parentId === parentId && e.type === 'Image' && e.locked);
            if (img) (img.props as Record<string, unknown>).skin = trimmed;
            return state;
          });
        } else {
          // 创建新子 Image，skin = 用户值，先按父当前宽高铺满（加载完成后再调整）
          const img = createDefaultElement('Image');
          img.name = '';
          img.parentId = parentId;
          img.x = 0; img.y = 0;
          img.width = parent.width; img.height = parent.height;
          img.props = { skin: trimmed };
          img.locked = true;

          set((state) => {
            const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === subPageId);
            if (!sp) return state;
            const p = sp.elements.find(e => e.id === parentId);
            if (p) (p.props as Record<string, unknown>)._skinLoadToken = token;
            sp.elements.push(img);
            return state;
          });
          const imgObj = createLayaComponent(img);
          if (imgObj) registerObject(img.id, imgObj);
        }

        // 异步加载，按实际尺寸调整父 + 子 + pivot
        loadImageSize(trimmed).then(size => {
          if (!size) return;
          // 校验 token 是否仍有效
          const stillValid = () => {
            const cur = get().currentCourse;
            if (!cur) return false;
            for (const stage of [...cur.stages, ...(cur.previewStages ?? [])]) {
              for (const p of stage.subPages) {
                const el = p.elements.find(e => e.id === parentId);
                if (el) {
                  const t = ((el.props as Record<string, unknown>)._skinLoadToken as number) ?? 0;
                  return t === token;
                }
              }
            }
            return false;
          };
          if (!stillValid()) return;

          set((state) => {
            const sp = state.currentCourse?.stages.flatMap(s => s.subPages).concat(state.currentCourse?.previewStages?.flatMap(s => s.subPages) ?? []).find(p => p.id === subPageId);
            if (!sp) return state;
            const p = sp.elements.find(e => e.id === parentId);
            if (!p) return state;
            p.width = size.w;
            p.height = size.h;
            (p.props as Record<string, unknown>).pivotX = size.w / 2;
            (p.props as Record<string, unknown>).pivotY = size.h / 2;
            const img = sp.elements.find(e => e.parentId === parentId && e.type === 'Image' && e.locked);
            if (img) {
              img.width = size.w;
              img.height = size.h;
              img.x = 0; img.y = 0;
            }
            return state;
          });
        });
      },
```

- [ ] **Step 4: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

注意：interface 中需要 `import type { SubPage } from '../types'`。如果未导入，加上。Element 应该已导入。

---

### Task 6: PropertyPanel 接入 proxyChildProps（路由 skin 字段）

**Files:**
- Modify: `src/components/PropertyPanel.tsx` (handleChange 路由代理字段)

- [ ] **Step 1: 在 handleChange 入口处理代理字段**

`src/components/PropertyPanel.tsx` 中找 `handleChange` 函数（约 PropertyPanel 主体内）。在函数最开始添加代理路由：

```tsx
  const setProxySkin = useEditorStore((s) => s.setProxySkin);

  const handleChange = (key: string, value: unknown) => {
    // 代理子元素属性：找当前选中元素 meta.proxyChildProps[key]，调用 setProxySkin
    if (single) {
      const proxy = elementMeta[single.type]?.proxyChildProps?.[key];
      if (proxy && proxy.childType === 'Image' && proxy.childProp === 'skin') {
        setProxySkin(single.id, String(value ?? ''));
        return;
      }
    }
    // ...原有逻辑
  };
```

注意：原 `handleChange` 内的现有逻辑必须保留。这里只是在最前面加一个早返回分支。

- [ ] **Step 2: 让 FieldRenderer 读取代理字段时显示子 Image 的 skin**

在 PropertyPanel 中，FieldRenderer 接收的 `field` / `elements` 由 PropertyPanel 传入。需要让 file 字段的初值反映「子 Image 的 skin 值」而非父元素自身的 skin。

最简方式：在 `handleChange` 之前（FieldRenderer 接到的 elements 准备时），如果元素有 proxyChildProps，把 element 的 props.skin 计算为子 Image 的 skin 值：

在 PropertyPanel `properties` 渲染处（Task 2 中我们改过的 `renderField`），不直接传 `selectedElements`，而传一个适配过的 elements 副本：

```tsx
                const renderField = (field: PropertyDef) => {
                  const propDefault = single ? (elementMeta[single.type]?.defaultProps as Record<string, unknown> | undefined)?.[field.key] : undefined;
                  const numDefault = typeof propDefault === 'number' ? propDefault : undefined;
                  // 代理字段：把子 Image 的属性临时合并到父元素 props 上，让 FieldRenderer 能正确读到值
                  const proxy = single ? elementMeta[single.type]?.proxyChildProps?.[field.key] : undefined;
                  let renderElements = selectedElements;
                  if (proxy && single) {
                    const childImg = currentPage?.elements.find(e => e.parentId === single.id && e.type === proxy.childType && e.locked);
                    const childVal = childImg ? (childImg.props as Record<string, unknown>)[proxy.childProp] : '';
                    renderElements = selectedElements.map(el => el.id === single.id ? { ...el, props: { ...el.props, [field.key]: childVal } } : el);
                  }
                  return <FieldRenderer key={field.key} field={field} elements={renderElements} onChange={handleChange} propDefault={numDefault} />;
                };
```

- [ ] **Step 3: 验证编译**

Run: `pnpm build`
Expected: 编译通过。

---

### Task 7: 端到端手动验证

**Files:** 无新修改

- [ ] **Step 1: 启动 dev server**

Run: `pnpm dev`

- [ ] **Step 2: 验证默认创建结构**

「豌豆口才」tab → 「拖拽题」 → 元素树显示：
- DragViewBox
  - 放置 (DragDropBox)
    - dj1 (DropObj，无子 Image)
  - 拖动 (DragDragBox)
    - aj1 (DragObj，**无**子 Image，**aj1 不是 a1**)

- [ ] **Step 3: 验证 DragObj 选中后属性面板**

- 没有「名称」输入框
- 没有「父容器」下拉
- 看到「图片」file 字段、「正确目标」elementRef 下拉
- 「高级设置」折叠区可展开，里面有 cusAttribute、group、pivotX/Y 等

- [ ] **Step 4: 验证图片代理 + 自动调整尺寸**

DragObj 的「图片」字段填入一张图片：
- 元素列表中 DragObj 下不出现新 Image 节点（被隐藏）
- DragObj 自身宽高变成图片实际尺寸
- pivotX/Y（在高级设置里）变成新尺寸 / 2

清空「图片」字段：
- 子 Image 被删除
- DragObj 宽高保持当前值

DropObj 同上。

- [ ] **Step 5: 验证「正确目标」范围限定**

页面上添加第二个 DragViewBox（再点一次「拖拽题」）。
选中第一个 DragViewBox 内的 DragObj，点「正确目标」下拉：只能看到第一个 DragViewBox 内的 DropObj，看不到第二个。

- [ ] **Step 6: 验证 DragViewBox 折叠**

选中 DragViewBox：属性面板默认只显「放置模式」，下方有「高级设置」折叠区，展开后看到 6 个交互开关。

- [ ] **Step 7: 验证撤销栈**

填图片 → Ctrl+Z 一次：尺寸 + 子 Image 都回退。
重做：尺寸 + 子 Image 都恢复。

- [ ] **Step 8: 验证导出 .scene**

执行课件导出，检查生成的 .scene 文件：
- DragObj/DropObj 节点宽高 = 图片实际尺寸
- DragObj 内有一个 Image 子节点，skin = 图片路径，宽高 = 父
- DropObj 若没填图，无子节点；若填了，有 Image 子节点
- 节点 props 不包含 `_skinLoadToken`（用 `_` 前缀，会被 export 自动 strip）
- 节点 props 不包含 `runtime`