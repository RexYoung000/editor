import type { Element } from '../types';
import { elementMeta, type ExportChild } from '../elements/elementMeta';
import { getKeyboardChildren } from '../elements/keyboardPresets';

/**
 * 模板用资源引用扫描。
 *
 * 与 exportProject.collectResources 的区别：这里只收集课件目录下的**用户上传资源**的相对路径（不含 viewDir 重映射），
 * 用于模板保存时把这些资源拷到模板库、模板加载时把它们拷回当前课件。
 *
 * 不收集：
 * - data:image/...（内联，没有源文件）
 * - /builtin/... 或 内置 exportPath（共享内置资源，不进模板库）
 * - /uploads/...（旧路径格式，新课件不应再产生）
 *
 * Spine 引用（.sk 路径）单独归类——加载/保存时按整个目录处理（含 .png 纹理、同目录音频）。
 */

export interface ResourceRefs {
  /** 用户上传图片：images/<file>.png|jpg|... */
  images: Set<string>;
  /** 上传视频：images/animation/<file>.mp4|webm|mov */
  videos: Set<string>;
  /** 上传音频：images/sound/<file>.wav|mp3 */
  sounds: Set<string>;
  /** Spine .sk 路径：images/animation/<aniDir>/<base>.sk */
  spineSkPaths: Set<string>;
}

function isImageRef(v: unknown): v is string {
  return typeof v === 'string'
    && v.startsWith('images/')
    && !v.startsWith('images/animation/')
    && !v.startsWith('images/sound/')
    && /\.(png|jpe?g|gif|webp)$/i.test(v);
}

function isVideoRef(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.(mp4|webm|mov)$/i.test(v);
}

function isSoundRef(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/sound/') && /\.(wav|mp3)$/i.test(v);
}

function isSpineSkRef(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith('images/animation/') && /\.sk$/i.test(v);
}

export function collectResourceRefs(elements: Element[]): ResourceRefs {
  const refs: ResourceRefs = {
    images: new Set(),
    videos: new Set(),
    sounds: new Set(),
    spineSkPaths: new Set(),
  };

  const visit = (value: unknown) => {
    if (isImageRef(value)) refs.images.add(value);
    else if (isVideoRef(value)) refs.videos.add(value);
    else if (isSoundRef(value)) refs.sounds.add(value);
    else if (isSpineSkRef(value)) refs.spineSkPaths.add(value);
  };

  const scanFixed = (children: ExportChild[] | undefined) => {
    if (!children) return;
    for (const c of children) {
      if (c.props) for (const v of Object.values(c.props)) visit(v);
      if (c.resources) for (const resource of c.resources) visit(resource);
      if (c.child) scanFixed(c.child);
    }
  };

  for (const el of elements) {
    const meta = elementMeta[el.type];
    const merged = { ...(meta?.defaultProps ?? {}), ...(el.props ?? {}) };
    for (const [k, v] of Object.entries(merged)) {
      // 编辑器专用字段（_ 前缀）原则上不收集；_foregroundSkin / _bgSkin / _wrongSkin 例外
      if (k.startsWith('_') && k !== '_foregroundSkin' && k !== '_bgSkin' && k !== '_wrongSkin') continue;
      visit(v);
    }
    if (el.actions) {
      for (const action of el.actions) {
        if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && action.value) {
          visit(action.value);
        }
      }
    }
    scanFixed(meta?.exportChildren);
    scanFixed(getKeyboardChildren(el));
  }

  return refs;
}

/**
 * 把元素树中 oldPath 出现的资源引用替换成 newPath。
 * 在模板加载完成、资源已重命名落盘到当前课件后，用此函数把 elements 内的引用同步更新。
 *
 * 替换范围与 collectResourceRefs 对齐：props（含 _foregroundSkin/_bgSkin/_wrongSkin 例外）、actions 的 playSound/stopSound value、exportChildren。
 *
 * `_keyboardPreset` 只存 id，children 在导出/扫描时按 id 查表得到，不参与路径重写。
 */
export function rewriteResourceRefs(
  elements: Element[],
  pathMap: Map<string, string>,
): Element[] {
  if (pathMap.size === 0) return elements;

  const rewriteValue = (v: unknown): unknown => {
    if (typeof v === 'string' && pathMap.has(v)) return pathMap.get(v);
    return v;
  };

  const rewriteProps = (props: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      out[k] = rewriteValue(v);
    }
    return out;
  };

  return elements.map((el) => {
    const newProps = el.props ? rewriteProps(el.props) : el.props;
    const newActions = el.actions?.map((a) => {
      if ((a.actionType === 'playSound' || a.actionType === 'stopSound') && a.value) {
        return { ...a, value: rewriteValue(a.value) };
      }
      return a;
    });
    return { ...el, props: newProps, actions: newActions };
  });
}
