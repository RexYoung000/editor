// 在 course 上根据 subPageId 找到 SubPage（同时遍历 stages 和 previewStages）。
// 抽成独立工具是为了避免循环依赖：editorStore → layaBridge → laya/selection 这条链上
// 也需要这个查找逻辑，把它放进 store 文件会形成 selection ↔ editorStore 的循环 import。
import type { Course, SubPage } from '../types';

/** 在 course 上根据 subPageId 找到 SubPage（同时遍历 stages 和 previewStages），找不到返回 null。
 *  immer 的 draft 与普通对象一样可写，set 内外都可调用：set 内传 state.currentCourse，set 外传 get().currentCourse。 */
export function findSubPage(course: Course | null | undefined, subPageId: string | null | undefined): SubPage | null {
  if (!course || !subPageId) return null;
  for (const stage of course.stages) {
    const sp = stage.subPages.find((s) => s.id === subPageId);
    if (sp) return sp;
  }
  for (const stage of (course.previewStages ?? [])) {
    const sp = stage.subPages.find((s) => s.id === subPageId);
    if (sp) return sp;
  }
  return null;
}
