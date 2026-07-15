export type LibraryQuickTagDefinition = {
  id: string;
  label: string;
  group: string;
  primary: boolean;
  pattern?: RegExp;
  pathPattern?: RegExp;
};

export const LIBRARY_QUICK_TAGS = [
  { id: 'highlight', label: '点亮一下', group: '教学内容', primary: true, pattern: /点亮一下/ },
  { id: 'method-summary', label: '方法小结', group: '教学内容', primary: true, pattern: /方法小结/ },
  { id: 'science', label: '科普', group: '教学内容', primary: true, pattern: /科普/ },
  { id: 'discussion', label: '讨论一下', group: '教学内容', primary: true, pattern: /讨论一下|讨论/ },
  { id: 'explore', label: '探索', group: '教学内容', primary: false, pattern: /探索/ },
  { id: 'summary', label: '总结', group: '教学内容', primary: false, pattern: /总结/ },
  { id: 'hint', label: '提示', group: '教学内容', primary: true, pattern: /提示|灯泡|感叹|叹号/ },

  { id: 'confirm', label: '确定', group: '流程导航', primary: true, pattern: /确定|確定|确认|確認/ },
  { id: 'submit', label: '提交/完成', group: '流程导航', primary: false, pattern: /提交|完成答题|完成答題/ },
  { id: 'continue', label: '继续', group: '流程导航', primary: true, pattern: /继续|繼續/ },
  { id: 'previous-step', label: '上一步', group: '流程导航', primary: false, pattern: /上一步/ },
  { id: 'next-step', label: '下一步', group: '流程导航', primary: false, pattern: /下一步/ },
  { id: 'previous-page', label: '上一页', group: '流程导航', primary: true, pattern: /上一页|上一頁|上页|上頁/ },
  { id: 'next-page', label: '下一页', group: '流程导航', primary: true, pattern: /下一页|下一頁|下页|下頁/ },
  { id: 'return', label: '返回', group: '流程导航', primary: false, pattern: /返回|后退/ },
  { id: 'close', label: '关闭', group: '流程导航', primary: false, pattern: /关闭/ },

  { id: 'media', label: '播放/音频', group: '媒体书写', primary: true, pattern: /播放|喇叭|音频|音頻/ },
  { id: 'pause', label: '暂停', group: '媒体书写', primary: false, pattern: /暂停/ },
  { id: 'brush', label: '画笔/批注', group: '媒体书写', primary: true, pattern: /画笔|畫筆|批注|筆/ },
  { id: 'eraser', label: '橡皮', group: '媒体书写', primary: false, pattern: /橡皮|擦除/ },
  { id: 'clear', label: '清空', group: '媒体书写', primary: true, pattern: /清空/ },

  { id: 'undo', label: '撤销', group: '编辑工具', primary: false, pattern: /撤销|撤回/ },
  { id: 'reset', label: '重置/刷新', group: '编辑工具', primary: false, pattern: /重置|刷新/ },
  { id: 'switch', label: '切换', group: '编辑工具', primary: false, pattern: /切换/ },
  { id: 'rotate', label: '旋转', group: '编辑工具', primary: false, pattern: /旋转/ },
  { id: 'mirror', label: '镜像', group: '编辑工具', primary: false, pattern: /镜像/ },
  { id: 'keyboard', label: '键盘', group: '编辑工具', primary: false, pattern: /键盘/ },
  { id: 'zoom', label: '放大镜', group: '编辑工具', primary: false, pattern: /放大镜/ },
  { id: 'sequence', label: '题号/序号', group: '编辑工具', primary: false, pattern: /题号|序号/ },
  { id: 'add', label: '添加', group: '编辑工具', primary: false, pattern: /添加/ },
  { id: 'delete', label: '删除', group: '编辑工具', primary: false, pattern: /删除|垃圾桶/ },

  { id: 'title-frame', label: '标题框', group: '基础框体', primary: false, pathPattern: /^通用素材\/通用框\/.*标题框\//u },
  { id: 'input-frame', label: '输入框', group: '基础框体', primary: false, pathPattern: /^通用素材\/通用框\/.*输入框\//u },
  { id: 'content-frame', label: '内容底框', group: '基础框体', primary: false, pathPattern: /^通用素材\/通用框\/S4-S7通用框\/三色矩形底框\//u },
  { id: 'secondary-dialog', label: '二级弹窗', group: '基础框体', primary: false, pathPattern: /^通用素材\/二级窗口\//u },
] as const satisfies readonly LibraryQuickTagDefinition[];

export type LibraryQuickTagId = (typeof LIBRARY_QUICK_TAGS)[number]['id'];

type LibraryQuickTagEntry = {
  name: string;
  libraryPath: string;
};

/**
 * 快捷检索属于业务分类检索，目录名本身就是标签来源。
 * 自由搜索仍由接口单独限制为只匹配文件名。
 */
export function matchesLibraryQuickTag(
  entry: LibraryQuickTagEntry,
  tag: LibraryQuickTagDefinition,
): boolean {
  return Boolean(
    (tag.pattern?.test(entry.libraryPath) ?? false)
    || (tag.pathPattern?.test(entry.libraryPath) ?? false),
  );
}
