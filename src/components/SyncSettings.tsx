import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface SyncConfig {
  ip: string;
  port: string;
  roomId: string;
}

interface Props {
  config: SyncConfig;
  onSave: (config: SyncConfig) => void;
  onClose: () => void;
}

export default function SyncSettings({ config, onSave, onClose }: Props) {
  const { t } = useI18n();
  const [ip, setIp] = useState(config.ip);
  const [port, setPort] = useState(config.port);
  const [roomId, setRoomId] = useState(config.roomId);

  const inputCls = 'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <span className="text-sm font-medium text-white">{t('syncServerConfig')}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('serverIp')}</label>
            <input className={inputCls} value={ip} onChange={(e) => setIp(e.target.value)} placeholder="127.0.0.1" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('port')}</label>
            <input className={inputCls} value={port} onChange={(e) => setPort(e.target.value)} placeholder="9001" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t('roomId')}</label>
            <input className={inputCls} value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="forge01" />
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-slate-700">
          <button onClick={onClose} className="flex-1 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded text-slate-300">{t('cancel')}</button>
          <button onClick={() => { onSave({ ip, port, roomId }); onClose(); }} className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white">{t('save')}</button>
        </div>
      </div>
    </div>
  );
}

export type { SyncConfig };
