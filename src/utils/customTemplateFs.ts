import type { Element, SubPage } from '../types';
import { collectResourceRefs, rewriteResourceRefs } from './collectResourceRefs';
import { getElementPages, isInternalPagesSubPage } from './internalPages';

/**
 * 自定义模板（基于本地文件夹）的存取与资源同步。
 *
 * 模板目录布局：
 * ```
 * <templateRootDir>/
 *   templates.json           # 索引 [{ id, name, createdAt, elementCount, thumbnail }]
 *   <id>/
 *     template.json          # { id, name, elements, createdAt }
 *     thumbnail.png          # 缩略图（保存时由 dataUrl 转 PNG 落盘）
 *     images/
 *       img_<full-md5>.<ext>          # 图片（用 32 位 MD5 命名）
 *       animation/
 *         <spineHash>/                # Spine 整目录，按 spine 自身 skeleton.hash 命名
 *           <base>.sk
 *           <base>.png
 *           *.mp3 (可选)
 *         video_<full-md5>.<ext>      # 视频
 *       sound/
 *         audio_<full-md5>.<ext>      # 音频
 * ```
 *
 * 课件目录布局（已有约定）：
 * ```
 * <courseDir>/
 *   images/
 *     img_<6位md5>.<ext>             # 图片（与 save-image-to-course 一致）
 *     animation/
 *       aniN/<base>.sk + .png + *.mp3 # Spine（aniN 由 importSpineFolder 分配）
 *       video_<6位md5>.<ext>
 *       .manifest.json                # spineHash → folderName 映射
 *     sound/
 *       audio_<6位md5>.<ext>
 * ```
 *
 * MD5 去重策略：
 * - 模板侧用 32 位完整 hash 命名（长期资源、库容量大、避免碰撞）
 * - 课件侧延续 6 位 hash 命名（与现有约定一致）；存在同前缀文件时校验 hash，碰撞则降级到完整 hash
 * - hash 计算结果在前端内存缓存，按 mtime+size 失效
 */

const TEMPLATE_DIR_KEY = 'forge_custom_template_dir';

const eApi = () => window.electronAPI;

// ─── localStorage：模板根目录 ───

export function getTemplateDir(): string | null {
  return localStorage.getItem(TEMPLATE_DIR_KEY);
}

export function setTemplateDir(dir: string | null): void {
  if (dir) localStorage.setItem(TEMPLATE_DIR_KEY, dir);
  else localStorage.removeItem(TEMPLATE_DIR_KEY);
}

// ─── 模板索引数据结构 ───

export interface TemplateIndexEntry {
  id: string;
  name: string;
  createdAt: number;
  elementCount: number;
  /** 相对路径，相对于模板根目录，如 '<id>/thumbnail.png' */
  thumbnail?: string;
  model?: 'legacy-elements' | 'internal-pages-v1';
  pageCount?: number;
}

export interface CustomTemplate {
  id: string;
  name: string;
  /** 元素树，资源路径已映射到模板侧（images/img_<full-md5>.png 等） */
  elements: Element[];
  model?: 'legacy-elements' | 'internal-pages-v1';
  subPage?: SubPage;
  pageCount?: number;
  createdAt: number;
  /** dataUrl，模板加载时由 thumbnail.png 转出供 UI 显示 */
  thumbnail?: string;
  /** 原始 PNG 文件相对路径，用于删除等清理操作 */
  thumbnailRelPath?: string;
}

// ─── 路径工具 ───

function joinPath(...parts: string[]): string {
  // Electron 主进程接受 / 与 \ 混用；统一用 / 简化前端逻辑
  return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function getExt(p: string): string {
  const i = p.lastIndexOf('.');
  return i >= 0 ? p.slice(i + 1).toLowerCase() : '';
}

// ─── Hash 缓存（mtime + size 失效） ───

interface HashCacheEntry { mtime: number; size: number; hash: string }
const hashCache = new Map<string, HashCacheEntry>();

async function getFileHash(absPath: string): Promise<string> {
  const stat = await eApi().statFile(absPath);
  if (!stat.ok) throw new Error(`stat 失败: ${absPath} (${stat.error})`);
  const cached = hashCache.get(absPath);
  if (cached && cached.mtime === stat.mtime && cached.size === stat.size) {
    return cached.hash;
  }
  const r = await eApi().hashFile(absPath);
  if (!r.ok) throw new Error(`hash 失败: ${absPath} (${r.error})`);
  hashCache.set(absPath, { mtime: stat.mtime, size: stat.size, hash: r.hash });
  return r.hash;
}

function invalidateHashEntry(absPath: string) {
  hashCache.delete(absPath);
}

// ─── 模板索引读写 ───

async function readIndex(rootDir: string): Promise<TemplateIndexEntry[]> {
  const indexPath = joinPath(rootDir, 'templates.json');
  if (!(await eApi().pathExists(indexPath))) return [];
  const buf = await eApi().readFileAsBuffer(indexPath);
  if (!buf) return [];
  try {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeIndex(rootDir: string, entries: TemplateIndexEntry[]): Promise<void> {
  const indexPath = joinPath(rootDir, 'templates.json');
  await eApi().writeTextFile(indexPath, JSON.stringify(entries, null, 2));
}

// ─── 列表 ───

/** 列出模板（含 thumbnail dataUrl） */
export async function listTemplates(): Promise<CustomTemplate[]> {
  const rootDir = getTemplateDir();
  if (!rootDir) return [];
  if (!(await eApi().pathExists(rootDir))) return [];
  const entries = await readIndex(rootDir);
  const result: CustomTemplate[] = [];
  for (const ent of entries) {
    const tmplDir = joinPath(rootDir, ent.id);
    const tmplJsonPath = joinPath(tmplDir, 'template.json');
    if (!(await eApi().pathExists(tmplJsonPath))) continue;
    const tmplBuf = await eApi().readFileAsBuffer(tmplJsonPath);
    if (!tmplBuf) continue;
    let tmpl: CustomTemplate;
    try {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(tmplBuf));
      tmpl = JSON.parse(text);
    } catch {
      continue;
    }
    // 加载缩略图为 dataUrl 供 UI 显示
    let thumbDataUrl: string | undefined;
    if (ent.thumbnail) {
      const thumbAbs = joinPath(rootDir, ent.thumbnail);
      if (await eApi().pathExists(thumbAbs)) {
        const buf = await eApi().readFileAsBuffer(thumbAbs);
        if (buf) {
          const b64 = arrayBufferToBase64(buf);
          thumbDataUrl = `data:image/png;base64,${b64}`;
        }
      }
    }
    result.push({
      id: tmpl.id,
      name: tmpl.name,
      elements: tmpl.elements ?? [],
      model: tmpl.model ?? 'legacy-elements',
      subPage: tmpl.subPage,
      pageCount: tmpl.pageCount ?? ent.pageCount ?? 1,
      createdAt: tmpl.createdAt ?? ent.createdAt,
      thumbnail: thumbDataUrl,
      thumbnailRelPath: ent.thumbnail,
    });
  }
  // 旧到新（最新加的在右/下）
  result.sort((a, b) => a.createdAt - b.createdAt);
  return result;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function dataUrlToBase64(dataUrl: string): { base64: string; mime: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
}

// ─── 自动命名 ───

function generateAutoName(existing: TemplateIndexEntry[]): string {
  const used = new Set(existing.map((e) => e.name));
  let i = 1;
  while (used.has(`自定义模板${i}`)) i++;
  return `自定义模板${i}`;
}

export function isNameTaken(name: string, existing: CustomTemplate[] | TemplateIndexEntry[], excludeId?: string): boolean {
  return existing.some((e) => e.name === name && e.id !== excludeId);
}

// ─── 保存 ───

let _idCounter = 0;
function genTemplateId(): string {
  return `tmpl_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;
}

export interface SaveTemplateOptions {
  /** 当前课件 id（用于解析 courseDir） */
  courseId: string;
  /** 课件本地目录（必须） */
  courseDir: string;
  /** 来源小关卡（保存其 elements + name） */
  sourceSubPage: SubPage;
  /** 缩略图 dataUrl（可空） */
  thumbnailDataUrl?: string;
  /** 模板名（缺省自动按"自定义模板N"递增） */
  name?: string;
}

export function collectSubPageResourceRefs(subPage: SubPage) {
  const merged = {
    images: new Set<string>(),
    videos: new Set<string>(),
    sounds: new Set<string>(),
    spineSkPaths: new Set<string>(),
  };
  for (const page of getElementPages(subPage)) {
    const refs = collectResourceRefs(page.elements);
    refs.images.forEach((value) => merged.images.add(value));
    refs.videos.forEach((value) => merged.videos.add(value));
    refs.sounds.forEach((value) => merged.sounds.add(value));
    refs.spineSkPaths.forEach((value) => merged.spineSkPaths.add(value));
  }
  return merged;
}

export function rewriteSubPageResources(subPage: SubPage, pathMap: Map<string, string>): SubPage {
  return {
    ...subPage,
    elements: rewriteResourceRefs(subPage.elements, pathMap),
    internalPages: subPage.internalPages?.map((page) => ({ ...page, elements: rewriteResourceRefs(page.elements, pathMap) })),
  };
}

export function customTemplateModel(subPage: SubPage): 'legacy-elements' | 'internal-pages-v1' {
  return isInternalPagesSubPage(subPage) ? 'internal-pages-v1' : 'legacy-elements';
}

export async function saveTemplate(opts: SaveTemplateOptions): Promise<CustomTemplate> {
  const rootDir = getTemplateDir();
  if (!rootDir) throw new Error('NO_TEMPLATE_DIR');

  await eApi().ensureDir(rootDir);
  const index = await readIndex(rootDir);

  const id = genTemplateId();
  const name = opts.name ?? generateAutoName(index);
  if (isNameTaken(name, index)) throw new Error('NAME_TAKEN');

  const finalTmplDir = joinPath(rootDir, id);
  const tmplDir = joinPath(rootDir, `${id}.tmp`);
  let committed = false;
  try {
  if (await eApi().pathExists(tmplDir)) await eApi().removeDir(tmplDir);
  await eApi().ensureDir(tmplDir);
  await eApi().ensureDir(joinPath(tmplDir, 'images'));
  await eApi().ensureDir(joinPath(tmplDir, 'images', 'animation'));
  await eApi().ensureDir(joinPath(tmplDir, 'images', 'sound'));

  // 1) 扫元素树的资源引用
  const sourceSubPage: SubPage = JSON.parse(JSON.stringify(opts.sourceSubPage));
  const refs = collectSubPageResourceRefs(sourceSubPage);
  const pathMap = new Map<string, string>();

  // 2) 普通文件资源（图/视频/音频）：MD5 → 模板侧用 32 位 hash 命名
  for (const ref of refs.images) {
    const dest = await copyFileToTemplate(opts.courseDir, ref, tmplDir, 'image');
    pathMap.set(ref, dest);
  }
  for (const ref of refs.videos) {
    const dest = await copyFileToTemplate(opts.courseDir, ref, tmplDir, 'video');
    pathMap.set(ref, dest);
  }
  for (const ref of refs.sounds) {
    const dest = await copyFileToTemplate(opts.courseDir, ref, tmplDir, 'sound');
    pathMap.set(ref, dest);
  }

  // 3) Spine 整目录：按 manifest 反查 spineHash，整目录拷到模板侧 images/animation/<spineHash>/
  if (refs.spineSkPaths.size > 0) {
    const courseManifest = await readManifest(opts.courseDir);
    for (const skRef of refs.spineSkPaths) {
      const parts = skRef.split('/'); // ['images','animation','aniN','<base>.sk']
      if (parts.length < 4) continue;
      const aniDir = parts[2];
      const skName = parts[3];
      // 反查 spineHash
      let spineHash = '';
      for (const [hash, folder] of Object.entries(courseManifest)) {
        if (folder === aniDir) { spineHash = hash; break; }
      }
      // 没有 spineHash（旧课件 / 转换前）→ 用 .sk 文件本身的 MD5 兜底
      if (!spineHash) {
        const skAbs = joinPath(opts.courseDir, skRef);
        spineHash = await getFileHash(skAbs);
      }
      const destFolder = `images/animation/${spineHash}`;
      const destFolderAbs = joinPath(tmplDir, destFolder);
      // 已存在则跳过整目录拷贝
      if (!(await eApi().pathExists(destFolderAbs))) {
        const srcFolderAbs = joinPath(opts.courseDir, 'images', 'animation', aniDir);
        const ok = await eApi().copyDir(srcFolderAbs, destFolderAbs);
        if (!ok) throw new Error(`Spine 目录拷贝失败: ${srcFolderAbs} → ${destFolderAbs}`);
      }
      pathMap.set(skRef, `${destFolder}/${skName}`);
    }
  }

  // 4) 用映射重写元素引用
  const remappedSubPage = rewriteSubPageResources(sourceSubPage, pathMap);
  const remappedElements = remappedSubPage.elements;

  // 5) 写 template.json
  const template: CustomTemplate = {
    id,
    name,
    elements: remappedElements,
    model: customTemplateModel(sourceSubPage),
    ...(isInternalPagesSubPage(sourceSubPage) ? { subPage: remappedSubPage, pageCount: getElementPages(sourceSubPage).length } : {}),
    createdAt: Date.now(),
  };
  await eApi().writeTextFile(joinPath(tmplDir, 'template.json'), JSON.stringify(template, null, 2));

  // 6) 写缩略图（dataUrl → PNG 文件）
  let thumbnailRelPath: string | undefined;
  if (opts.thumbnailDataUrl) {
    const decoded = dataUrlToBase64(opts.thumbnailDataUrl);
    if (decoded) {
      const thumbAbs = joinPath(tmplDir, 'thumbnail.png');
      await eApi().writeBinaryFile(thumbAbs, decoded.base64);
      thumbnailRelPath = `${id}/thumbnail.png`;
    }
  }

  // 7) 完整写好临时目录后再原子改名，索引永远不指向半成品
  if (!(await eApi().renameFile(tmplDir, finalTmplDir))) {
    await eApi().removeDir(tmplDir);
    throw new Error('模板临时目录提交失败');
  }
  committed = true;

  // 8) 更新索引（新模板追加到末尾）
  index.push({
    id,
    name,
    createdAt: template.createdAt,
    elementCount: getElementPages(remappedSubPage).reduce((sum, page) => sum + page.elements.length, 0),
    thumbnail: thumbnailRelPath,
    model: template.model,
    pageCount: template.pageCount ?? 1,
  });
  await writeIndex(rootDir, index);

  return {
    id,
    name,
    elements: remappedElements,
    model: template.model,
    subPage: template.subPage,
    pageCount: template.pageCount,
    createdAt: template.createdAt,
    thumbnail: opts.thumbnailDataUrl,
    thumbnailRelPath,
  };
  } catch (error) {
    await eApi().removeDir(committed ? finalTmplDir : tmplDir);
    throw error;
  }
}

async function copyFileToTemplate(
  courseDir: string,
  ref: string,
  tmplDir: string,
  kind: 'image' | 'video' | 'sound',
): Promise<string> {
  const srcAbs = joinPath(courseDir, ref);
  const hash = await getFileHash(srcAbs);
  const ext = getExt(ref);
  const prefix = kind === 'image' ? 'img' : kind === 'video' ? 'video' : 'audio';
  const fileName = `${prefix}_${hash}.${ext}`;
  let destRel: string;
  if (kind === 'image') destRel = `images/${fileName}`;
  else if (kind === 'video') destRel = `images/animation/${fileName}`;
  else destRel = `images/sound/${fileName}`;
  const destAbs = joinPath(tmplDir, destRel);
  if (!(await eApi().pathExists(destAbs))) {
    const ok = await eApi().copyLocalFile(srcAbs, destAbs);
    if (!ok) throw new Error(`资源拷贝失败: ${srcAbs} → ${destAbs}`);
  }
  return destRel;
}

async function readManifest(courseDir: string): Promise<Record<string, string>> {
  const manifestAbs = joinPath(courseDir, 'images', 'animation', '.manifest.json');
  const buf = await eApi().readFileAsBuffer(manifestAbs);
  if (!buf) return {};
  try {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
    const data = JSON.parse(text);
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

async function writeManifest(courseDir: string, manifest: Record<string, string>): Promise<void> {
  const manifestAbs = joinPath(courseDir, 'images', 'animation', '.manifest.json');
  await eApi().writeTextFile(manifestAbs, JSON.stringify(manifest, null, 2));
}

// ─── 加载（应用模板到课件）───

export interface ApplyTemplateOptions {
  courseId: string;
  courseDir: string;
  template: CustomTemplate;
}

export interface AppliedTemplate {
  model: 'legacy-elements' | 'internal-pages-v1';
  subPage: SubPage;
}

/**
 * 把模板的 elements 复制一份，并把内部资源引用重写到当前课件的本地路径。
 * 如目标资源不存在则从模板拷贝。返回的 elements 可直接塞进 SubPage.elements。
 */
export async function applyTemplate(opts: ApplyTemplateOptions): Promise<AppliedTemplate> {
  const rootDir = getTemplateDir();
  if (!rootDir) throw new Error('NO_TEMPLATE_DIR');

  const tmplDir = joinPath(rootDir, opts.template.id);
  if (!(await eApi().pathExists(tmplDir))) throw new Error(`模板目录不存在: ${tmplDir}`);

  // 课件目录基础结构准备
  await eApi().ensureDir(joinPath(opts.courseDir, 'images'));
  await eApi().ensureDir(joinPath(opts.courseDir, 'images', 'animation'));
  await eApi().ensureDir(joinPath(opts.courseDir, 'images', 'sound'));

  const sourceSubPage: SubPage = opts.template.model === 'internal-pages-v1' && opts.template.subPage
    ? JSON.parse(JSON.stringify(opts.template.subPage))
    : { id: `template-${opts.template.id}`, name: opts.template.name, elements: JSON.parse(JSON.stringify(opts.template.elements)) };
  const refs = collectSubPageResourceRefs(sourceSubPage);
  const pathMap = new Map<string, string>();

  for (const ref of refs.images) {
    const dest = await copyFileToCourse(tmplDir, ref, opts.courseDir, 'image');
    pathMap.set(ref, dest);
  }
  for (const ref of refs.videos) {
    const dest = await copyFileToCourse(tmplDir, ref, opts.courseDir, 'video');
    pathMap.set(ref, dest);
  }
  for (const ref of refs.sounds) {
    const dest = await copyFileToCourse(tmplDir, ref, opts.courseDir, 'sound');
    pathMap.set(ref, dest);
  }

  if (refs.spineSkPaths.size > 0) {
    const courseManifest = await readManifest(opts.courseDir);
    let manifestDirty = false;
    for (const skRef of refs.spineSkPaths) {
      // 模板侧路径形如 images/animation/<spineHash>/<base>.sk
      const parts = skRef.split('/');
      if (parts.length < 4) continue;
      const spineHash = parts[2];
      const skName = parts[3];

      let targetFolder = courseManifest[spineHash];
      const targetSkAbs = targetFolder
        ? joinPath(opts.courseDir, 'images', 'animation', targetFolder, skName)
        : '';
      if (targetFolder && (await eApi().pathExists(targetSkAbs))) {
        // 已经导入过该 spineHash，复用
        pathMap.set(skRef, `images/animation/${targetFolder}/${skName}`);
        continue;
      }

      // 分配新的 aniN 目录
      const animBaseAbs = joinPath(opts.courseDir, 'images', 'animation');
      const existing = await eApi().listDirectory(animBaseAbs);
      const taken = new Set(existing.filter((e) => e.isDir).map((e) => e.name));
      let idx = 1;
      while (taken.has(`ani${idx}`)) idx++;
      targetFolder = `ani${idx}`;
      const targetFolderAbs = joinPath(animBaseAbs, targetFolder);
      const srcFolderAbs = joinPath(tmplDir, 'images', 'animation', spineHash);
      const ok = await eApi().copyDir(srcFolderAbs, targetFolderAbs);
      if (!ok) throw new Error(`Spine 目录拷贝失败: ${srcFolderAbs} → ${targetFolderAbs}`);
      courseManifest[spineHash] = targetFolder;
      manifestDirty = true;
      pathMap.set(skRef, `images/animation/${targetFolder}/${skName}`);
    }
    if (manifestDirty) await writeManifest(opts.courseDir, courseManifest);
  }

  return {
    model: opts.template.model === 'internal-pages-v1' ? 'internal-pages-v1' : 'legacy-elements',
    subPage: rewriteSubPageResources(sourceSubPage, pathMap),
  };
}

/**
 * 把模板侧的一个文件落到课件目录，复用现有同 hash 文件。
 * 课件命名沿用 6 位 hash 约定；若 6 位前缀已被占用且 hash 不匹配（极少见），降级到完整 hash。
 */
async function copyFileToCourse(
  tmplDir: string,
  ref: string,
  courseDir: string,
  kind: 'image' | 'video' | 'sound',
): Promise<string> {
  const srcAbs = joinPath(tmplDir, ref);
  const hash = await getFileHash(srcAbs);
  const short = hash.slice(0, 6);
  const ext = getExt(ref);
  const prefix = kind === 'image' ? 'img' : kind === 'video' ? 'video' : 'audio';
  const subDir = kind === 'image' ? 'images' : kind === 'video' ? 'images/animation' : 'images/sound';
  const subDirAbs = joinPath(courseDir, subDir);

  // 优先扫目录下已有的同 hash 文件（同 save-image-to-course 的去重思路）
  const existing = await eApi().listDirectory(subDirAbs);
  for (const e of existing) {
    if (e.isDir) continue;
    if (!e.name.endsWith(`.${ext}`)) continue;
    if (!e.name.includes(`_${short}.`)) continue;
    // 命中 6 位前缀，校验完整 hash 一致才视为同一文件
    const candAbs = joinPath(subDirAbs, e.name);
    try {
      const cmp = await getFileHash(candAbs);
      if (cmp === hash) return `${subDir}/${e.name}`;
    } catch { /* 忽略，按新文件处理 */ }
  }

  // 新增：先尝试 6 位短名；若文件名已被占用且 hash 不一致，则使用完整 hash 命名
  let destName = `${prefix}_${short}.${ext}`;
  let destAbs = joinPath(subDirAbs, destName);
  if (await eApi().pathExists(destAbs)) {
    // 同名但内容不同：用完整 hash 命名
    destName = `${prefix}_${hash}.${ext}`;
    destAbs = joinPath(subDirAbs, destName);
    if (await eApi().pathExists(destAbs)) {
      // 都已存在，直接复用
      return `${subDir}/${destName}`;
    }
  }
  const ok = await eApi().copyLocalFile(srcAbs, destAbs);
  if (!ok) throw new Error(`资源拷贝失败: ${srcAbs} → ${destAbs}`);
  invalidateHashEntry(destAbs);
  return `${subDir}/${destName}`;
}

// ─── 删除 ───

export async function removeTemplate(templateId: string): Promise<void> {
  const rootDir = getTemplateDir();
  if (!rootDir) throw new Error('NO_TEMPLATE_DIR');
  const index = await readIndex(rootDir);
  const newIndex = index.filter((e) => e.id !== templateId);
  if (newIndex.length === index.length) return;
  const tmplDir = joinPath(rootDir, templateId);
  if (await eApi().pathExists(tmplDir)) {
    await eApi().removeDir(tmplDir);
  }
  await writeIndex(rootDir, newIndex);
}

// ─── 重命名 ───

export async function renameTemplate(templateId: string, newName: string): Promise<void> {
  const rootDir = getTemplateDir();
  if (!rootDir) throw new Error('NO_TEMPLATE_DIR');
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('EMPTY_NAME');
  const index = await readIndex(rootDir);
  if (index.some((e) => e.name === trimmed && e.id !== templateId)) {
    throw new Error('NAME_TAKEN');
  }
  const ent = index.find((e) => e.id === templateId);
  if (!ent) throw new Error('TEMPLATE_NOT_FOUND');
  ent.name = trimmed;
  await writeIndex(rootDir, index);

  // 同步 template.json
  const tmplJsonPath = joinPath(rootDir, templateId, 'template.json');
  if (await eApi().pathExists(tmplJsonPath)) {
    const buf = await eApi().readFileAsBuffer(tmplJsonPath);
    if (buf) {
      try {
        const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
        const data = JSON.parse(text);
        data.name = trimmed;
        await eApi().writeTextFile(tmplJsonPath, JSON.stringify(data, null, 2));
      } catch { /* 索引已更新，主体失败可容忍 */ }
    }
  }
}

// ─── 置顶（把模板挪到列表第一位） ───

/**
 * 把模板的 createdAt 改成比当前所有模板的最小 createdAt 还小 1，
 * 由于 listTemplates 按 createdAt 升序排列（"最新的在右下"），这等同于把它放到第一位。
 * 同时更新索引 templates.json 和 template.json 主体（listTemplates 读的是主体里的 createdAt）。
 */
export async function pinTemplate(templateId: string): Promise<void> {
  const rootDir = getTemplateDir();
  if (!rootDir) throw new Error('NO_TEMPLATE_DIR');
  const index = await readIndex(rootDir);
  const ent = index.find((e) => e.id === templateId);
  if (!ent) throw new Error('TEMPLATE_NOT_FOUND');

  let minCreatedAt = Number.MAX_SAFE_INTEGER;
  for (const e of index) {
    if (typeof e.createdAt === 'number' && e.createdAt < minCreatedAt) minCreatedAt = e.createdAt;
  }
  const base = minCreatedAt === Number.MAX_SAFE_INTEGER ? Date.now() : minCreatedAt;
  const newCreatedAt = base - 1;
  ent.createdAt = newCreatedAt;
  await writeIndex(rootDir, index);

  // 同步 template.json 主体
  const tmplJsonPath = joinPath(rootDir, templateId, 'template.json');
  if (await eApi().pathExists(tmplJsonPath)) {
    const buf = await eApi().readFileAsBuffer(tmplJsonPath);
    if (buf) {
      try {
        const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
        const data = JSON.parse(text);
        data.createdAt = newCreatedAt;
        await eApi().writeTextFile(tmplJsonPath, JSON.stringify(data, null, 2));
      } catch { /* 索引已更新，主体失败可容忍 */ }
    }
  }
}

// ─── 导入（从另一个模板根目录批量导入到当前模板根目录） ───

export interface ImportResult {
  added: number;
  failures: Array<{ name: string; error: string }>;
}

/** 规一化用于比较的目录路径：统一为 /，去尾斜杠，Windows 大小写小写化 */
function normalizeDirForCompare(p: string): string {
  let s = p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/+$/, '');
  // Windows 文件系统大小写不敏感，统一小写比较
  if (/^[a-zA-Z]:/.test(s)) s = s.toLowerCase();
  return s;
}

function resolveImportName(srcName: string, taken: Set<string>): string {
  if (/^自定义模板\d+$/.test(srcName)) {
    let i = 1;
    while (taken.has(`自定义模板${i}`)) i++;
    return `自定义模板${i}`;
  }
  if (!taken.has(srcName)) return srcName;
  let n = 1;
  while (taken.has(`${srcName}(${n})`)) n++;
  return `${srcName}(${n})`;
}

/**
 * 从另一个模板根目录批量导入模板到当前模板根目录。
 *
 * 流程：
 * 1. 校验源/目标目录不重叠（同目录或互为子目录均拒绝）
 * 2. 读源 templates.json,空索引视为无可导入模板
 * 3. 逐条 copyDir 整目录拷贝(模板侧资源是 32 位 MD5 命名,无需再做 hash 校验)
 *    - 命名冲突: "自定义模板N" 递增 N; 其他名按 "原名(1)/(2)/..." 追加
 *    - 单条失败时清理已创建的目标目录,记入 failures 不中断
 * 4. 全部处理完后一次性写索引
 *
 * 错误：
 * - INVALID_DIR：源和目标目录冲突
 * - EMPTY_SOURCE：源目录无 templates.json 或索引为空
 * - NO_TEMPLATE_DIR：当前未设置模板根目录
 */
export async function importTemplatesFromDir(sourceDir: string): Promise<ImportResult> {
  const targetDir = getTemplateDir();
  if (!targetDir) throw new Error('NO_TEMPLATE_DIR');

  // 1) 路径校验
  const srcNorm = normalizeDirForCompare(sourceDir);
  const tgtNorm = normalizeDirForCompare(targetDir);
  if (
    srcNorm === tgtNorm ||
    srcNorm.startsWith(tgtNorm + '/') ||
    tgtNorm.startsWith(srcNorm + '/')
  ) {
    throw new Error('INVALID_DIR');
  }

  // 2) 读源索引
  const srcIndex = await readIndex(sourceDir);
  if (srcIndex.length === 0) throw new Error('EMPTY_SOURCE');

  await eApi().ensureDir(targetDir);
  const targetIndex = await readIndex(targetDir);
  const taken = new Set(targetIndex.map((e) => e.name));
  const takenIds = new Set(targetIndex.map((e) => e.id));

  const pendingEntries: TemplateIndexEntry[] = [];
  const failures: Array<{ name: string; error: string }> = [];

  // 3) 逐条拷贝
  for (const srcEnt of srcIndex) {
    const srcTmplDir = joinPath(sourceDir, srcEnt.id);
    const srcTmplJson = joinPath(srcTmplDir, 'template.json');
    if (!(await eApi().pathExists(srcTmplJson))) {
      failures.push({ name: srcEnt.name, error: '源模板数据缺失' });
      continue;
    }

    // 生成不冲突的新 id（极少冲突，循环兜底）
    let newId = genTemplateId();
    while (takenIds.has(newId)) newId = genTemplateId();
    takenIds.add(newId);

    const newName = resolveImportName(srcEnt.name, taken);
    taken.add(newName);

    const dstTmplDir = joinPath(targetDir, newId);
    try {
      const ok = await eApi().copyDir(srcTmplDir, dstTmplDir);
      if (!ok) throw new Error('目录拷贝失败');

      // 改写 template.json 的 id 和 name
      const dstTmplJson = joinPath(dstTmplDir, 'template.json');
      const buf = await eApi().readFileAsBuffer(dstTmplJson);
      if (!buf) throw new Error('读取 template.json 失败');
      let data: { id?: string; name?: string; elements?: Element[]; createdAt?: number };
      try {
        const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
        data = JSON.parse(text);
      } catch {
        throw new Error('解析 template.json 失败');
      }
      data.id = newId;
      data.name = newName;
      const newCreatedAt = Date.now();
      data.createdAt = newCreatedAt;
      await eApi().writeTextFile(dstTmplJson, JSON.stringify(data, null, 2));

      // 缩略图相对路径换 id
      let newThumbnailRel: string | undefined;
      if (srcEnt.thumbnail) {
        const thumbAbs = joinPath(dstTmplDir, 'thumbnail.png');
        if (await eApi().pathExists(thumbAbs)) {
          newThumbnailRel = `${newId}/thumbnail.png`;
        }
      }

      pendingEntries.push({
        id: newId,
        name: newName,
        createdAt: newCreatedAt,
        elementCount: srcEnt.elementCount,
        thumbnail: newThumbnailRel,
      });
    } catch (e) {
      // 清理半成品
      if (await eApi().pathExists(dstTmplDir)) {
        try { await eApi().removeDir(dstTmplDir); } catch { /* ignore */ }
      }
      // 回收名字 / id 占用，避免同批后续误判
      taken.delete(newName);
      takenIds.delete(newId);
      failures.push({ name: srcEnt.name, error: (e as Error).message || '未知错误' });
    }
  }

  // 4) 统一写索引
  if (pendingEntries.length > 0) {
    await writeIndex(targetDir, [...targetIndex, ...pendingEntries]);
  }

  return { added: pendingEntries.length, failures };
}
