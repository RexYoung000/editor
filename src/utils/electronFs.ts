import type { Course, Stage } from '../types';
import type { CourseType } from '../presets/types';

const api = () => window.electronAPI;

// ─── 路径存储（localStorage） ───

function storeDir(courseId: string, dirPath: string) {
  localStorage.setItem(`forge_course_dir_${courseId}`, dirPath);
}

function storeFile(courseId: string, filePath: string) {
  localStorage.setItem(`forge_course_file_${courseId}`, filePath);
}

function getDir(courseId: string): string | null {
  return localStorage.getItem(`forge_course_dir_${courseId}`);
}

function getFile(courseId: string): string | null {
  return localStorage.getItem(`forge_course_file_${courseId}`);
}

// ─── 选择目录 ───

export async function selectDirectory(): Promise<string | null> {
  return api().selectDirectory();
}

// ─── 新建课件 ───

export async function createProjectInDirectory(
  courseId: string,
  parentPath: string,
  type: CourseType,
): Promise<{ course: Course; filePath: string }> {
  const exists = await api().pathExists(`${parentPath}/${courseId}`);
  if (exists) throw new Error('DIR_ALREADY_EXISTS');

  const courseDir = await api().createDirectory(parentPath, courseId);

  const course: Course = {
    id: courseId,
    type,
    // Existing export/preview code still reads kind, so new courses mirror type into kind.
    kind: type,
    stages: [],
  };

  const filePath = `${courseDir}/${courseId}.json`;
  await api().writeCourseFile(filePath, JSON.stringify(course, null, 2));

  storeDir(courseId, courseDir);
  storeFile(courseId, filePath);

  return { course, filePath };
}

// ─── 另存为课件 ───

/**
 * 把当前课件整目录拷到 <parentPath>/<newId>/，删旧产物，重命名 JSON 并改 id 字段。
 * 任一步失败都会回滚（删除已创建的新目录），错误抛 Error，由调用方决定文案。
 */
export async function saveProjectAs(
  course: Course,
  newId: string,
  parentPath: string,
): Promise<{ course: Course; filePath: string }> {
  const sourceDir = getDir(course.id);
  if (!sourceDir) throw new Error('NO_SOURCE_DIR');

  const targetDir = `${parentPath}/${newId}`;
  if (await api().pathExists(targetDir)) throw new Error('DIR_ALREADY_EXISTS');

  // 整目录拷贝
  const copied = await api().copyDir(sourceDir, targetDir);
  if (!copied) throw new Error('COPY_FAILED');

  // 后续任一失败都回滚
  try {
    // 删旧产物（不存在不会报错）
    await api().removeDir(`${targetDir}/project`);
    await api().removeDir(`${targetDir}/esBuild`);

    // 重命名 JSON 文件
    const oldJsonPath = `${targetDir}/${course.id}.json`;
    const newJsonPath = `${targetDir}/${newId}.json`;
    const renamed = await api().renameFile(oldJsonPath, newJsonPath);
    if (!renamed) throw new Error('RENAME_FAILED');

    // 改 JSON 内容里的 id 并写回
    const newCourse: Course = { ...course, id: newId };
    await api().writeCourseFile(newJsonPath, JSON.stringify(newCourse, null, 2));

    // 登记新课件路径
    storeDir(newId, targetDir);
    storeFile(newId, newJsonPath);

    return { course: newCourse, filePath: newJsonPath };
  } catch (e) {
    // 回滚：删除已创建的新目录
    try { await api().removeDir(targetDir); } catch { /* 回滚失败不掩盖原错 */ }
    throw e;
  }
}

// ─── 打开课件 ───

export async function openProjectFromDirectory(
  dirPath: string,
): Promise<{ course: Course; filePath: string } | null> {
  const entries = await api().listDirectory(dirPath);
  for (const entry of entries) {
    if (!entry.isDir && entry.name.endsWith('.json')) {
      const filePath = `${dirPath}/${entry.name}`;
      try {
        const course: Course = await api().readCourseFile(filePath);
        if (course.id && Array.isArray(course.stages)) {
          storeDir(course.id, dirPath);
          storeFile(course.id, filePath);
          return { course, filePath };
        }
      } catch { /* 跳过 */ }
    }
  }
  // 也检查子文件夹
  for (const entry of entries) {
    if (entry.isDir) {
      const subEntries = await api().listDirectory(`${dirPath}/${entry.name}`);
      for (const sub of subEntries) {
        if (!sub.isDir && sub.name.endsWith('.json')) {
          const filePath = `${dirPath}/${entry.name}/${sub.name}`;
          try {
            const course: Course = await api().readCourseFile(filePath);
            if (course.id && Array.isArray(course.stages)) {
              storeDir(course.id, `${dirPath}/${entry.name}`);
              storeFile(course.id, filePath);
              return { course, filePath };
            }
          } catch { /* 跳过 */ }
        }
      }
    }
  }
  return null;
}

// ─── 写回本地文件 ───

export async function writeBackToLocalFile(courseId: string, course: Course): Promise<void> {
  const filePath = getFile(courseId);
  if (!filePath) throw new Error('NO_FILE_PATH');
  await api().writeCourseFile(filePath, JSON.stringify(course, null, 2));
}

// ─── 获取课件文件路径 ───

export function getCourseFilePath(courseId: string): string | null {
  return getFile(courseId);
}

// ─── 获取课件目录路径 ───

export function getCourseDirPath(courseId: string): string | null {
  return getDir(courseId);
}

// ─── 检查路径是否存在 ───

export async function pathExists(filePath: string): Promise<boolean> {
  return api().pathExists(filePath);
}

// ─── 打开文件夹 ───

export async function openFolder(folderPath: string): Promise<boolean> {
  return api().openFolder(folderPath);
}

// ─── 图片操作 ───

const dataUrlCache = new Map<string, string>();
const CACHE_MAX = 200;

export async function copyImageToCourse(courseId: string, srcPath: string): Promise<string> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  return api().copyImageToCourse(courseDir, srcPath);
}

export async function readFileAsDataUrl(courseId: string, relativePath: string): Promise<string | null> {
  const cached = dataUrlCache.get(relativePath);
  if (cached) return cached;
  const courseDir = getDir(courseId);
  if (!courseDir) return null;
  const dataUrl = await api().readFileAsDataUrl(courseDir, relativePath);
  if (dataUrl) {
    if (dataUrlCache.size >= CACHE_MAX) {
      const oldest = dataUrlCache.keys().next().value!;
      dataUrlCache.delete(oldest);
    }
    dataUrlCache.set(relativePath, dataUrl);
  }
  return dataUrl;
}

export async function cleanupUnreferencedImages(courseId: string, referencedPaths: string[]): Promise<void> {
  const courseDir = getDir(courseId);
  if (!courseDir) return;
  await api().cleanupUnreferencedImages(courseDir, referencedPaths);
}

export function collectImageReferences(course: Course): string[] {
  const refs: string[] = [];
  const collect = (stages: Stage[]) => {
    for (const stage of stages) {
      for (const sub of stage.subPages) {
        const elementGroups = [sub.elements, ...(sub.internalPages?.map((page) => page.elements) ?? [])];
        for (const el of elementGroups.flat()) {
          for (const value of Object.values(el.props)) {
            if (typeof value === 'string' && value.startsWith('images/')) {
              refs.push(value);
            }
          }
          // playSound / stopSound 动作中的音频路径也是引用
          if (el.actions) {
            for (const action of el.actions) {
              if ((action.actionType === 'playSound' || action.actionType === 'stopSound') && typeof action.value === 'string' && action.value.startsWith('images/')) {
                refs.push(action.value);
              }
            }
          }
        }
      }
    }
  };
  collect(course.stages);
  if (course.previewStages) collect(course.previewStages);
  return refs;
}

export async function isSvnDirectory(dirPath: string): Promise<boolean> {
  return api().isSvnDirectory(dirPath);
}

// ─── Spine 动画转换 ───
// 选中的 Spine 项目文件夹（含 .json/.atlas/.png 三件套）→ 转出 .sk + .png 到课件本地
// images/animation/<basename>/ 下，并返回结果路径 + 解析出的动画名列表。

export interface SpineImportResult {
  /** 写进 element.props.skin 的运行时相对路径，如 'images/animation/game/game.sk' */
  skinRelPath: string;
  /** 解析出的所有动画名（来自 .json 的 animations 字段） */
  animationNames: string[];
  /** atlas png 的相对路径，编辑器占位预览可用 */
  pngRelPath: string;
}

// 在 Spine 文件夹中找到所有 .json+.atlas+.png 三件套
async function findAllSpineJsons(
  spineFolderAbsPath: string,
): Promise<Array<{ baseName: string; jsonPath: string }>> {
  const sep = spineFolderAbsPath.includes('\\') ? '\\' : '/';
  const dirs: string[] = [`${spineFolderAbsPath}${sep}json`, spineFolderAbsPath];
  try {
    const top = await api().listDirectory(spineFolderAbsPath);
    for (const e of top) {
      if (e.isDir && e.name !== 'json' && e.name !== 'images') {
        dirs.push(`${spineFolderAbsPath}${sep}${e.name}`);
      }
    }
  } catch { /* ignore */ }

  const results: Array<{ baseName: string; jsonPath: string }> = [];
  const seen = new Set<string>();
  for (const dir of dirs) {
    if (!(await api().pathExists(dir))) continue;
    const entries = await api().listDirectory(dir);
    for (const entry of entries) {
      if (entry.isDir || !entry.name.toLowerCase().endsWith('.json')) continue;
      const base = entry.name.replace(/\.json$/i, '');
      if (seen.has(base.toLowerCase())) continue;
      const hasAtlas = entries.some((e) => !e.isDir && e.name.toLowerCase() === `${base.toLowerCase()}.atlas`);
      const hasPng = entries.some((e) => !e.isDir && e.name.toLowerCase() === `${base.toLowerCase()}.png`);
      if (hasAtlas && hasPng) {
        seen.add(base.toLowerCase());
        results.push({ baseName: base, jsonPath: `${dir}${sep}${entry.name}` });
      }
    }
  }
  return results;
}

// 在 Spine 文件夹中找到 .json 文件，返回 { baseName, jsonPath } —— 兼容三种布局（保留旧接口）
async function findSpineJson(
  spineFolderAbsPath: string,
): Promise<{ baseName: string; jsonPath: string } | null> {
  const all = await findAllSpineJsons(spineFolderAbsPath);
  return all.length > 0 ? all[0] : null;
}

// 在 Spine 文件夹中找到 .json 的 basename（findSpineJson 的薄包装，保持旧 API）
async function findSpineBaseName(spineFolderAbsPath: string): Promise<string> {
  const found = await findSpineJson(spineFolderAbsPath);
  return found?.baseName ?? 'game';
}
void findSpineBaseName;

export async function importSpineFolder(
  courseId: string,
  spineFolderAbsPath: string,
): Promise<SpineImportResult[]> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');

  const sep = courseDir.includes('\\') ? '\\' : '/';
  const animBaseDir = `${courseDir}${sep}images${sep}animation`;
  await api().ensureDir(animBaseDir);

  // 找到所有 .json+.atlas+.png 三件套
  const allJsons = await findAllSpineJsons(spineFolderAbsPath);
  if (allJsons.length === 0) throw new Error('未找到 Spine 工程文件');

  // 读取 manifest（hash → folderName 映射）
  const manifestPath = `${animBaseDir}${sep}.manifest.json`;
  let manifest: Record<string, string> = {};
  const manifestBuf = await api().readFileAsBuffer(manifestPath);
  if (manifestBuf) {
    try { manifest = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(manifestBuf))); } catch { /* ignore */ }
  }

  // 解析每个 .json 的 hash 和动画名
  const jsonInfos: Array<{ baseName: string; jsonPath: string; hash: string; animationNames: string[] }> = [];
  for (const item of allJsons) {
    let hash = '';
    let animationNames: string[] = [];
    const buf = await api().readFileAsBuffer(item.jsonPath);
    if (buf) {
      try {
        const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
        const data = JSON.parse(text);
        hash = data?.skeleton?.hash ?? '';
        if (data?.animations && typeof data.animations === 'object') {
          animationNames = Object.keys(data.animations);
        }
      } catch { /* ignore */ }
    }
    jsonInfos.push({ ...item, hash, animationNames });
  }

  // 检查是否所有文件都已缓存（全部 hash 命中）
  const cachedResults: SpineImportResult[] = [];
  let allCached = true;
  for (const info of jsonInfos) {
    if (info.hash && manifest[info.hash]) {
      const existingFolder = manifest[info.hash];
      const existingSkPath = `${animBaseDir}${sep}${existingFolder}${sep}${info.baseName}.sk`;
      if (await api().pathExists(existingSkPath)) {
        cachedResults.push({
          skinRelPath: `images/animation/${existingFolder}/${info.baseName}.sk`,
          animationNames: info.animationNames,
          pngRelPath: `images/animation/${existingFolder}/${info.baseName}.png`,
        });
        continue;
      }
    }
    allCached = false;
    break;
  }
  if (allCached && cachedResults.length === jsonInfos.length) {
    return cachedResults;
  }

  // 需要转换：分配新目录，批量转换
  // get-subdirs 返回完整绝对路径，需要取 basename 再比对
  const existingDirs = await api().getSubdirs(animBaseDir);
  const existingNames = new Set(existingDirs.map(p => p.split(/[\\/]/).pop() ?? ''));
  let idx = 1;
  while (existingNames.has(`ani${idx}`)) idx++;
  const folderName = `ani${idx}`;
  const outAbsDir = `${animBaseDir}${sep}${folderName}`;
  await api().ensureDir(outAbsDir);

  const convertResult = await api().convertSpineAll(spineFolderAbsPath, outAbsDir);
  if (!convertResult.ok || !convertResult.results?.length) {
    throw new Error(convertResult.error ?? 'convert failed');
  }

  // 将源目录中的音频文件（.mp3/.wav/.ogg）复制到输出目录
  const AUDIO_EXTS = /\.(mp3|wav|ogg)$/i;
  const srcDirs = [spineFolderAbsPath];
  try {
    const topEntries = await api().listDirectory(spineFolderAbsPath);
    for (const e of topEntries) {
      if (e.isDir) srcDirs.push(`${spineFolderAbsPath}${sep}${e.name}`);
    }
  } catch { /* ignore */ }
  for (const dir of srcDirs) {
    const entries = await api().listDirectory(dir);
    for (const entry of entries) {
      if (!entry.isDir && AUDIO_EXTS.test(entry.name)) {
        await api().copyLocalFile(`${dir}${sep}${entry.name}`, `${outAbsDir}${sep}${entry.name}`);
      }
    }
  }

  // 构建返回结果，更新 manifest
  const results: SpineImportResult[] = [];
  for (let i = 0; i < convertResult.results.length; i++) {
    const r = convertResult.results[i];
    const skName = r.skPath.split(/[\\/]/).pop() ?? '';
    const baseName = skName.replace(/\.sk$/i, '');
    const skinRelPath = `images/animation/${folderName}/${skName}`;
    const pngRelPath = `images/animation/${folderName}/${baseName}.png`;
    // 匹配对应的 jsonInfo 获取动画名
    const matchInfo = jsonInfos.find(j => j.baseName.toLowerCase() === baseName.toLowerCase());
    results.push({ skinRelPath, animationNames: matchInfo?.animationNames ?? [], pngRelPath });
    // 更新 manifest
    if (matchInfo?.hash) {
      manifest[matchInfo.hash] = folderName;
    }
  }

  await api().writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
  return results;
}

// ─── 资源库下载（远程库 → 本地课程目录） ───

/**
 * 根据扩展名决定库下载文件落在课程目录的哪个子目录。
 * 子目录里加 'library' 这一层是为了和"用户上传文件"物理隔离，便于将来清理。
 * Spine 走单独的 downloadLibrarySpine（落 images/animation/aniN/，不走这里）。
 */
function pickLocalSubdir(ext: string): string {
  const e = ext.toLowerCase();
  if (/^\.(png|jpg|jpeg|gif|webp)$/.test(e)) return 'images/library';
  if (/^\.(mp3|wav|ogg)$/.test(e)) return 'images/sound/library';
  if (/^\.(mp4|webm|mov)$/.test(e)) return 'images/animation/library';
  throw new Error(`不支持的资源类型: ${ext}`);
}

/** ArrayBuffer → base64（writeBinaryFile 需要 base64 入参） */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

/**
 * 把资源库里的单个图片/音频/视频下载到本课程目录，自动按扩展名分发到 images/library/ 等子目录。
 * 已存在则直接复用（hash 编码进文件名 → pathExists 即去重）。
 *
 * @param courseId 当前课程 id
 * @param libraryPath 库内相对路径，如 '思维课/一年级/标签/img_lt_1.png'
 * @returns 写进 element.props 的相对路径，如 'images/library/a3f5b8c2_img_lt_1.png'
 */
export async function downloadLibraryFile(
  courseId: string,
  libraryPath: string,
): Promise<{ localRelPath: string }> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  const sep = courseDir.includes('\\') ? '\\' : '/';

  // 1. 取 hash + size
  const infoRes = await fetch(`/api/library/file-info?path=${encodeURIComponent(libraryPath)}`);
  if (!infoRes.ok) {
    const errBody = await infoRes.json().catch(() => null);
    throw new Error(errBody?.error ?? `file-info 失败: HTTP ${infoRes.status}`);
  }
  const info = await infoRes.json() as { ok: boolean; hash: string; size: number };
  if (!info.hash) throw new Error('file-info 返回缺少 hash');

  // 2. 算本地路径
  const lastSlash = libraryPath.lastIndexOf('/');
  const fileName = lastSlash >= 0 ? libraryPath.slice(lastSlash + 1) : libraryPath;
  const dotIdx = fileName.lastIndexOf('.');
  const ext = dotIdx >= 0 ? fileName.slice(dotIdx) : '';
  const baseName = dotIdx >= 0 ? fileName.slice(0, dotIdx) : fileName;
  if (!ext) throw new Error(`资源库文件缺少扩展名: ${libraryPath}`);

  const subdir = pickLocalSubdir(ext);
  const localRel = `${subdir}/${info.hash}_${baseName}${ext}`;
  const absPath = `${courseDir}${sep}${localRel.split('/').join(sep)}`;

  // 3. 已存在 → 直接复用（pathExists 即去重）
  if (await api().pathExists(absPath)) {
    return { localRelPath: localRel };
  }

  // 4. 下载文件
  const fileRes = await fetch(`/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}`);
  if (!fileRes.ok) throw new Error(`下载文件失败: HTTP ${fileRes.status}`);
  const fileBuf = await fileRes.arrayBuffer();

  // 5. 确保目录 + 写盘
  const dirOnly = absPath.substring(0, absPath.lastIndexOf(sep));
  await api().ensureDir(dirOnly);
  await api().writeBinaryFile(absPath, arrayBufferToBase64(fileBuf));

  return { localRelPath: localRel };
}

/**
 * 把资源库里的 Spine 工程文件夹下载到本地临时目录，转交给 importSpineFolder 走原有转换/缓存流程。
 * 现有 importSpineFolder 内部按 skeleton.hash 去重（同 hash 的不同选择会复用 images/animation/aniN/）。
 *
 * @param courseId 当前课程 id
 * @param libraryPath 库内相对路径，如 '思维课/一年级/Spine/鼓掌'
 * @returns SpineImportResult[] —— 每个元素含 skinRelPath / animationNames / pngRelPath
 */
export async function downloadLibrarySpine(
  courseId: string,
  libraryPath: string,
): Promise<SpineImportResult[]> {
  const courseDir = getDir(courseId);
  if (!courseDir) throw new Error('NO_DIR_PATH');
  const sep = courseDir.includes('\\') ? '\\' : '/';

  // 1. 拉取 Spine 文件夹下所有文件清单
  const listRes = await fetch(`/api/library/spine-files?path=${encodeURIComponent(libraryPath)}`);
  if (!listRes.ok) {
    const errBody = await listRes.json().catch(() => null);
    throw new Error(errBody?.error ?? `spine-files 失败: HTTP ${listRes.status}`);
  }
  const list = await listRes.json() as { ok: boolean; files: string[] };
  if (!Array.isArray(list.files) || list.files.length === 0) {
    throw new Error('Spine 工程没有可下载文件');
  }

  // 2. 创建本地临时目录
  const tmpName = `spine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = `${courseDir}${sep}.tmp${sep}${tmpName}`;
  await api().ensureDir(tmpDir);

  try {
    // 3. 逐个下载到 tmpDir，保留相对子目录
    for (const f of list.files) {
      const url = `/builtin/library/${libraryPath.split('/').map(encodeURIComponent).join('/')}/${f.split('/').map(encodeURIComponent).join('/')}`;
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error(`下载 ${f} 失败: HTTP ${fileRes.status}`);
      const buf = await fileRes.arrayBuffer();

      const target = `${tmpDir}${sep}${f.split('/').join(sep)}`;
      const dirOnly = target.substring(0, target.lastIndexOf(sep));
      await api().ensureDir(dirOnly);
      await api().writeBinaryFile(target, arrayBufferToBase64(buf));
    }

    // 4. 调现有 importSpineFolder（转换 + 拷贝到 images/animation/aniN/ + 写 manifest）
    const results = await importSpineFolder(courseId, tmpDir);
    return results;
  } finally {
    // 5. 清理临时目录（失败不阻断主流程）
    try {
      await api().removeDir(tmpDir);
    } catch {
      // 忽略清理失败
    }
  }
}
