# playSound 动作导出与 UI 改造设计

## 问题

按钮事件动作中的 `playSound` 存在两个问题：

1. **导出接口错误**：当前导出使用 `Laya.SoundManager.playSound(path)`，但 sdk_baiya 体系统一使用 `this.playSound()` 接口（如 gameUtilsSource.ts 中的 `playRightSound` / `playWrongSound`）
2. **音频资源不收集**：`action.value` 不在 `element.props` 中，`collectResources` 不扫描 actions，导致音频文件不被打包、路径不被重写，导出的课件找不到音频文件

## 改动 1：导出改造（exportProject.ts）

### collectResources 扫描 actions 音频路径

在 `collectResources` 的元素循环中，遍历 `el.actions`，对 `playSound` / `stopSound` 类型的 action 的 `value` 执行 `collectValue`：

```ts
// 现有: for (const v of Object.values(merged)) collectValue(v);
// 新增:
if (el.actions) {
  for (const action of el.actions) {
    if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && action.value) {
      collectValue(action.value);
    }
  }
}
```

### playSound 导出改用 this.playSound

```ts
// 原来: Laya.SoundManager.playSound(${JSON.stringify(action.value)})
// 改为: this.playSound(${JSON.stringify(action.value)})
```

需要确保 `action.value` 中的路径已被 `rewriteProps` 同等机制重写。目前 `action.value` 不经过 `rewriteProps`，需要在事件代码生成循环中手动重写：

```ts
case 'playSound': {
  const soundPath = typeof action.value === 'string' && resourceMap.has(action.value)
    ? resourceMap.get(action.value) : action.value;
  initCode += `        if (${varName}) ${varName}.on('${event}', this, function() { this.playSound(${JSON.stringify(soundPath)}); });\n`;
  break;
}
```

注：`stopSound` 也同步改为 `this.stopSound()`。

### exportPreviewProject.ts 同步

`exportPreviewProject.ts` 的 `collectResources` 和事件代码生成也需要做相同改动（双路径同步）。

## 改动 2：ActionEditor UI 改造

当前 playSound 区域：文本框 + 裸 `<input type="file">` 样式简陋。

改为跟 SoundButton `soundPath` 属性面板一致的体验：

- 文本框显示路径，可手动编辑
- 上传按钮改成小图标按钮（Upload 图标），样式与属性面板一致
- 上传逻辑不变（Electron IPC: `saveImageToCourse`）
- 增加清除按钮，一键清空音频路径

只考虑 Electron 本机模式，不涉及 /api/upload。

## 涉及文件

- `src/utils/exportProject.ts` — collectResources 扫描 actions、playSound 导出改 this.playSound、路径重写
- `src/utils/exportPreviewProject.ts` — 同步改动
- `src/components/ActionEditor.tsx` — playSound 上传 UI 改造