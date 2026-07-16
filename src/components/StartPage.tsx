import { useState, useEffect } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { showToast } from '../utils/toast';
import { createProjectInDirectory, openProjectFromDirectory, selectDirectory } from '../utils/electronFs';
import CreateProjectDialog from './CreateProjectDialog';

interface Props {
  onEnterEditor: (course: import('../types').Course) => void;
}

export default function StartPage({ onEnterEditor }: Props) {
  const { t } = useI18n();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [teacherId, setTeacherId] = useState(() => localStorage.getItem('forge_teacher_id') || '');
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('forge_server_url') || window.location.origin);

  // Electron 服务器输入窗口传入的地址 → 自动同步到 serverUrl
  useEffect(() => {
    // 开发服务也可以直接在浏览器中打开；此时没有 Electron 注入的本机 API。
    // 只跳过地址同步，避免起始页因读取不存在的 API 而整体卸载。
    window.electronAPI?.getServerUrl().then(url => {
      if (url) {
        setServerUrl(url);
        localStorage.setItem('forge_server_url', url);
      }
    });
  }, []);

  const saveConfig = () => {
    localStorage.setItem('forge_teacher_id', teacherId.trim());
    localStorage.setItem('forge_server_url', serverUrl.trim() || window.location.origin);
  };

  const handleOpenProject = async () => {
    saveConfig();
    const dir = await selectDirectory();
    if (!dir) return;
    // SVN 检查暂时禁用，后续需要时恢复
    // if (typeof dir === 'string' && !(await isSvnDirectory(dir))) {
    //   showToast(t('notSvnDir'), 'error');
    //   return;
    // }
    const result = await openProjectFromDirectory(dir);
    if (result) {
      onEnterEditor(result.course);
    } else {
      showToast(t('noCourseFileFound'), 'error');
    }
  };

  const handleCreateConfirm = async (courseId: string, dirPath: string, kind: 'normal' | 'homework' | 'sEvaluation' | 'review' = 'normal') => {
    try {
      // SVN 检查暂时禁用，后续需要时恢复
      // if (typeof dirPath === 'string' && !(await isSvnDirectory(dirPath))) {
      //   showToast(t('notSvnDir'), 'error');
      //   return;
      // }
      saveConfig();
      const { course } = await createProjectInDirectory(courseId, dirPath, kind);
      setShowCreateDialog(false);
      onEnterEditor(course);
    } catch (e) {
      if ((e as Error).message === 'DIR_ALREADY_EXISTS') {
        showToast(t('courseDirAlreadyExists'), 'error');
      } else {
        showToast(t('createFailed'), 'error');
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-900 flex items-center justify-center" style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', letterSpacing: '0.1em' }}>课件编辑器</h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem' }}>{t('courseEditor')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem', alignItems: 'center' }}>
          <input
            value={teacherId}
            onChange={e => setTeacherId(e.target.value)}
            placeholder="教师工号（必填）"
            style={{ width: '16rem', padding: '0.6rem 1rem', background: '#1e293b', color: 'white', borderRadius: '0.5rem', fontSize: '0.9rem', border: '1px solid #475569', outline: 'none' }}
          />
          <input
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            placeholder="服务器地址"
            style={{ width: '16rem', padding: '0.6rem 1rem', background: '#1e293b', color: 'white', borderRadius: '0.5rem', fontSize: '0.9rem', border: '1px solid #475569', outline: 'none' }}
          />
          <button
            onClick={() => { saveConfig(); setShowCreateDialog(true); }}
            disabled={!teacherId.trim()}
            style={{ width: '16rem', padding: '0.75rem 1.5rem', background: teacherId.trim() ? '#2563eb' : '#1e3a6e', color: teacherId.trim() ? 'white' : '#64748b', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: teacherId.trim() ? 'pointer' : 'not-allowed', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <Plus size={20} />
            {t('createProject')}
          </button>
          <button
            onClick={handleOpenProject}
            disabled={!teacherId.trim()}
            style={{ width: '16rem', padding: '0.75rem 1.5rem', background: teacherId.trim() ? '#334155' : '#1e293b', color: teacherId.trim() ? 'white' : '#64748b', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: teacherId.trim() ? 'pointer' : 'not-allowed', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <FolderOpen size={20} />
            {t('openProject')}
          </button>
        </div>
      </div>

      {showCreateDialog && (
        <CreateProjectDialog
          onConfirm={handleCreateConfirm}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
