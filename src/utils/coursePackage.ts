import JSZip from 'jszip';
import type { Course } from '../types';
import { showToast } from './toast';
import { getCourseDirPath, readFileAsDataUrl } from './electronFs';

/**
 * 收集课件中所有的资源路径
 */
function collectResourcePaths(course: Course): Set<string> {
  const paths = new Set<string>();

  course.stages.forEach((stage) => {
    stage.subPages.forEach((page) => {
      page.elements.forEach((el) => {
        if (!el.props) return;

        for (const value of Object.values(el.props)) {
          if (typeof value === 'string') {
            // 收集 images/ 路径（Electron 本地资源）
            if (value.startsWith('images/')) {
              paths.add(value);
            }
          }
        }
      });
    });
  });

  return paths;
}

/**
 * 导出课件为 ZIP 包（包含资源文件）
 */
export async function exportCourseAsZip(course: Course): Promise<void> {
  try {
    const zip = new JSZip();

    // 1. 添加课件 JSON
    zip.file('course.json', JSON.stringify(course, null, 2));

    // 2. 收集并添加资源文件
    const resourcePaths = collectResourcePaths(course);
    const resourcesFolder = zip.folder('resources');

    if (!resourcesFolder) {
      throw new Error('无法创建 resources 文件夹');
    }

    let successCount = 0;
    let failCount = 0;

    for (const path of resourcePaths) {
      try {
        // Electron 模式：通过 IPC 读取本地 images/ 文件
        const courseId = course.id;
        const dataUrl = await readFileAsDataUrl(courseId, path);
        if (!dataUrl) {
          console.warn(`资源文件不存在: ${path}`);
          failCount++;
          continue;
        }
        const base64 = dataUrl.split(',')[1];
        const ext = path.split('.').pop() || 'png';
        const mimeToType: Record<string, string> = { 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'wav': 'audio/wav', 'mp3': 'audio/mpeg' };
        const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mimeToType[ext] || 'application/octet-stream' });
        // 保持路径结构：images/file.png -> file.png
        const relativePath = path.replace('images/', '');
        resourcesFolder.file(relativePath, blob);
        successCount++;
      } catch (error) {
        console.error(`获取资源失败: ${path}`, error);
        failCount++;
      }
    }

    // 3. 生成 ZIP 并下载
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course.id}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    if (failCount > 0) {
      showToast(`导出完成，但有 ${failCount} 个资源文件缺失`, 'warning');
    } else {
      showToast(`导出成功，包含 ${successCount} 个资源文件`, 'success');
    }
  } catch (error) {
    console.error('导出失败:', error);
    showToast('导出失败: ' + (error as Error).message, 'error');
    throw error;
  }
}

/**
 * 从 ZIP 包导入课件（包含资源文件）
 */
export async function importCourseFromZip(file: File): Promise<Course> {
  try {
    const zip = await JSZip.loadAsync(file);

    // 1. 读取课件 JSON
    const courseFile = zip.file('course.json');
    if (!courseFile) {
      throw new Error('ZIP 包中缺少 course.json 文件');
    }

    const courseJson = await courseFile.async('text');
    const course: Course = JSON.parse(courseJson);

    // 验证课件结构
    if (!course.id || !Array.isArray(course.stages)) {
      throw new Error('无效的课件格式：缺少 id 或 stages');
    }

    for (const stage of course.stages) {
      if (!Array.isArray(stage.subPages)) {
        throw new Error('无效的大关卡格式：缺少 subPages');
      }
      for (const page of stage.subPages) {
        if (!page.id || !Array.isArray(page.elements)) {
          throw new Error('无效的小关卡格式：缺少 id 或 elements');
        }
      }
    }

    // 2. 保存资源文件到本地课程目录
    const resourcesFolder = zip.folder('resources');
    if (resourcesFolder) {
      const resourceFiles: { [key: string]: JSZip.JSZipObject } = {};
      resourcesFolder.forEach((relativePath, file) => {
        if (!file.dir) {
          resourceFiles[relativePath] = file;
        }
      });

      const courseDir = getCourseDirPath(course.id);
      const savePromises: Promise<{ oldPath: string; newPath: string }>[] = [];

      for (const [relativePath, zipFile] of Object.entries(resourceFiles)) {
        const savePromise = (async () => {
          try {
            const arrayBuffer = await zipFile.async('arraybuffer');
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            const filename = relativePath.split('/').pop() || 'unknown';
            const ext = filename.split('.').pop() || 'png';

            if (!courseDir) {
              return { oldPath: `/uploads/${relativePath}`, newPath: `/uploads/${relativePath}` };
            }

            const relPath = await window.electronAPI.saveImageToCourse(courseDir, filename, base64, ext);
            return { oldPath: `/uploads/${relativePath}`, newPath: relPath };
          } catch (error) {
            console.error(`保存资源失败: ${relativePath}`, error);
            return { oldPath: `/uploads/${relativePath}`, newPath: `/uploads/${relativePath}` };
          }
        })();
        savePromises.push(savePromise);
      }

      const saveResults = await Promise.all(savePromises);
      const pathMap = new Map<string, string>();
      saveResults.forEach(({ oldPath, newPath }) => {
        pathMap.set(oldPath, newPath);
      });

      course.stages.forEach((stage) => {
        stage.subPages.forEach((page) => {
          page.elements.forEach((el) => {
            if (!el.props) return;

            for (const [key, value] of Object.entries(el.props)) {
              if (typeof value === 'string' && value.startsWith('/uploads/')) {
                const newPath = pathMap.get(value);
                if (newPath) {
                  el.props[key] = newPath;
                }
              }
            }
          });
        });
      });

      showToast(`导入成功，已保存 ${saveResults.length} 个资源文件`, 'success');
    } else {
      showToast('导入成功（无资源文件）', 'success');
    }

    return course;
  } catch (error) {
    console.error('导入失败:', error);
    showToast('导入失败: ' + (error as Error).message, 'error');
    throw error;
  }
}

/**
 * 导出课件为 JSON（仅数据，不含资源）
 * 用于快速备份或跨项目共享配置
 */
export function exportCourseAsJSON(course: Course): void {
  const json = JSON.stringify(course, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${course.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已导出 JSON（不含资源文件）', 'info');
}

/**
 * 从 JSON 导入课件（仅数据，不含资源）
 */
export function importCourseFromJSON(file: File): Promise<Course> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const course = JSON.parse(e.target?.result as string);
        if (!course.id || !Array.isArray(course.stages)) {
          reject(new Error('无效的课件格式：缺少 id 或 stages'));
          return;
        }
        for (const stage of course.stages) {
          if (!Array.isArray(stage.subPages)) {
            reject(new Error('无效的大关卡格式：缺少 subPages'));
            return;
          }
          for (const page of stage.subPages) {
            if (!page.id || !Array.isArray(page.elements)) {
              reject(new Error('无效的小关卡格式：缺少 id 或 elements'));
              return;
            }
          }
        }
        showToast('已导入 JSON（资源路径可能失效）', 'warning');
        resolve(course);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}