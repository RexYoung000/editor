# ChoiceBoxOkBtn — 口才课确定按钮组件设计

## 目标

在口才课组件栏目添加一个"确定按钮"组件，配合 ChoiceBox 实现选择判断逻辑，导出代码完全复刻 Game1_0401.ts 中 btn_ok 对 choiceBox 的操作。

## 组件元数据

在 `src/elements/elementMeta.ts` 新增：

```typescript
ChoiceBoxOkBtn: {
  layaType: 'ScaleButton',
  label: '确定按钮',
  category: 'speechCourse',          // 口才课组件栏目
  defaultSize: { width: 272, height: 92 },
  placeholderImage: assetSrc('okBtn.m_qddk_on'),
  runtime: 'com.klzz.ui.custom.ScaleButton',
  defaultProps: {
    skin: assetExport('okBtn.m_qddk_on'),
    stateNum: 1,
    label: '',
    var: 'btn_ok',
  },
  properties: [
    { key: 'var', label: '变量名', type: 'text', group: '交互' },
  ],
}
```

- `var: 'btn_ok'` — 与课件源码命名一致，导出时用于自动绑定检测
- `stateNum: 1` — 单张切图，无状态变化，仅缩放动画
- `placeholderImage` — 编辑模式下用 Laya Image 占位渲染（符合 newComponents 约定）
- `runtime` — 导出时按 ScaleButton runtime 输出
- `category: 'speechCourse'` — 显示在口才课组件栏目

## 内置资源注册

在 `src/elements/builtinAssets.ts` 的 `BUILTIN_ASSETS` 数组新增：

```typescript
{ id: 'okBtn.m_qddk_on', src: 'runtime/game/okBtn/m_qddk_on.png', exportPath: 'game/okBtn/m_qddk_on.png' },
```

将 `m_qddk_on.png` 从 `C:\Users\wwjie\Desktop\3D通用按钮切图\按钮切图\` 复制到 `public/builtin/runtime/game/okBtn/` 目录。

> 注意：`public/builtin/runtime/game/` 目录新增图片后必须重新打包，否则导出的课件找不到新资源。

## 导出逻辑（两套导出均需修改）

forge 有两套导出路径，每套都需要添加 ChoiceBox 判断逻辑：

| 导出 | 文件 | 产物 | 用途 |
|------|------|------|------|
| 预览导出 | `src/utils/export.ts` | `LessonZK.js` | 编辑器内预览/发布到 preview-server |
| 工程导出 | `src/utils/exportProject.ts` | `.scene` + `.ts` 文件 | 导出完整 LayaAir 工程供 SVN 提交 |

---

### 预览导出（export.ts）

#### 页面检测函数

紧跟 `pageNeedsConfirmLogic` 之后新增：

```typescript
function pageNeedsChoiceBoxOkLogic(page: Page): boolean {
  let hasBtnOk = false;
  let hasChoiceBox = false;
  for (const el of page.elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    if (merged.var === 'btn_ok') hasBtnOk = true;
    if (meta?.layaType === 'ChoiceBox') hasChoiceBox = true;
    if (hasBtnOk && hasChoiceBox) return true;
  }
  return false;
}
```

#### 导出代码生成

在 `generateLessonJs` 中，紧跟每处 `pageNeedsConfirmLogic` 代码块之后插入（正课页面 + 预习页面各一处）：

```typescript
// 口才课选择页面：自动绑定确定按钮 → ChoiceBox 判断对错
if (pageNeedsChoiceBoxOkLogic(page)) {
  lines.push(`            if (this.btn_ok && this.choiceBox) {`);
  lines.push(`                this.btn_ok.on(Laya.Event.CLICK, this, function() {`);
  lines.push(`                    this.mouseEnabled = false;`);
  lines.push(`                    if (this.choiceBox.isRight) {`);
  lines.push(`                        com.klzz.media.KlSoundManager.playSound("share/sound/rush_flag.wav");`);
  lines.push(`                        Laya.timer.once(4000, this, function() {`);
  lines.push(`                            com.biz.VipThink.viewMgr.feedBackView.event("showAnswerFace", [1]);`);
  lines.push(`                        });`);
  lines.push(`                    } else {`);
  lines.push(`                        com.klzz.media.KlSoundManager.playSound("share/sound/anwser_wrong.wav");`);
  lines.push(`                        this.choiceBox.cancelAllSel();`);
  lines.push(`                        this.mouseEnabled = true;`);
  lines.push(`                    }`);
  lines.push(`                });`);
  lines.push(`            }`);
}
```

---

### 工程导出（exportProject.ts）

#### SceneFlags 扩展

扩展 `SceneFlags` 接口和 `detectSceneFlags` 函数，新增 `hasBtnOk` 和 `hasChoiceBox`：

```typescript
interface SceneFlags {
  hasBtnConfirm: boolean;
  hasKlInputBox: boolean;
  hasBtnOk: boolean;
  hasChoiceBox: boolean;
}

function detectSceneFlags(page: SubPage): SceneFlags {
  let hasBtnConfirm = false;
  let hasKlInputBox = false;
  let hasBtnOk = false;
  let hasChoiceBox = false;
  for (const el of page.elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) } as Record<string, unknown>;
    if (merged.var === '_btnConfirm') hasBtnConfirm = true;
    const wrapperVar = (meta?.exportWrapper?.props as Record<string, unknown> | undefined)?.var;
    if (wrapperVar === '_klInputBox') hasKlInputBox = true;
    if (merged.var === 'btn_ok') hasBtnOk = true;
    if (meta?.layaType === 'ChoiceBox') hasChoiceBox = true;
  }
  return { hasBtnConfirm, hasKlInputBox, hasBtnOk, hasChoiceBox };
}
```

#### generateSceneTs 扩展

在 `generateSceneTs` 函数中，紧跟现有 `initConfirm` 条件之后新增 ChoiceBox 判断逻辑：

```typescript
function generateSceneTs(sceneName: string, flags: SceneFlags): string {
  let initCode = '';
  if (flags.hasBtnConfirm && flags.hasKlInputBox) {
    initCode += '        GameUtils.initConfirm(this, this._btnConfirm, this._klInputBox, null, this._lockBox);\n';
  }
  if (flags.hasBtnOk && flags.hasChoiceBox) {
    initCode += `        this.btn_ok.on(Event.CLICK, this, function() {\n`;
    initCode += `            this.mouseEnabled = false;\n`;
    initCode += `            if (this.choiceBox.isRight) {\n`;
    initCode += `                com.klzz.media.KlSoundManager.playSound("share/sound/rush_flag.wav");\n`;
    initCode += `                Laya.timer.once(4000, this, function() {\n`;
    initCode += `                    com.biz.VipThink.viewMgr.feedBackView.event("showAnswerFace", [1]);\n`;
    initCode += `                });\n`;
    initCode += `            } else {\n`;
    initCode += `                com.klzz.media.KlSoundManager.playSound("share/sound/anwser_wrong.wav");\n`;
    initCode += `                this.choiceBox.cancelAllSel();\n`;
    initCode += `                this.mouseEnabled = true;\n`;
    initCode += `            }\n`;
    initCode += `        });\n`;
  }
  // ... 原有 template string
}
```

---

使用 sdk_baiya 通用音效（`share/sound/rush_flag.wav` 正确、`share/sound/anwser_wrong.wav` 错误），这些是运行时自带资源，无需课件单独提供。

完全复刻 Game1_0401.ts 中 `OnBtnClick` 逻辑：
- 点击 btn_ok → `mouseEnabled = false` 防重复点击
- 正确 → 播放通用正确音效 + 4秒延迟后显示反馈页笑脸
- 错误 → 播放通用错误音效 + `choiceBox.cancelAllSel()` 清除选择 + 重新允许交互

## ActionEditor 手动配置

ActionEditor 对所有元素自动渲染，ChoiceBoxOkBtn 作为普通元素自动获得事件动作编辑能力。页面级自动绑定逻辑是"额外追加"的，不替代手动配置的动作——两者共存导出。

不需要额外改动 ActionEditor。

## 需修改的文件清单

| 文件 | 修改内容 |
|------|----------|
| `src/elements/elementMeta.ts` | 新增 ChoiceBoxOkBtn 元数据 |
| `src/elements/builtinAssets.ts` | 新增 okBtn.m_qddk_on 资源注册 |
| `src/utils/export.ts` | 新增 `pageNeedsChoiceBoxOkLogic` 函数 + 导出代码生成（正课+预习两处） |
| `src/utils/exportProject.ts` | 扩展 `SceneFlags` + `detectSceneFlags` + `generateSceneTs` |
| `public/builtin/runtime/game/okBtn/m_qddk_on.png` | 新增切图文件 |

## 成功标准

1. 编辑器口才课组件栏目中出现"确定按钮"，拖到画布后显示占位图
2. 属性面板中可编辑变量名(var)，默认为 `btn_ok`
3. 同一页面放置 ChoiceBoxOkBtn + ChoiceBox 时，导出的 LessonZK.js 自动包含判断对错逻辑
4. 同一页面放置 ChoiceBoxOkBtn + ChoiceBox 时，导出的 .ts 工程文件也自动包含判断对错逻辑
5. 导出的按钮节点类型为 ScaleButton，runtime 为 `com.klzz.ui.custom.ScaleButton`
6. 导出的 skin 路径指向 `game/okBtn/m_qddk_on.png`