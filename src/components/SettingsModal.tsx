import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIPAM } from '../store/IPAMContext';
import { defaultGitlabConfig } from '../lib/gitlab';
import { X } from 'lucide-react';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { gitlabConfig, setGitlabConfig } = useIPAM();
  const [config, setConfig] = useState(gitlabConfig);

  const handleSave = () => {
    setGitlabConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('GitLab Integration Settings')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
            <input 
              type="checkbox" 
              checked={config.enabled}
              onChange={e => setConfig({...config, enabled: e.target.checked})}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-900"
            />
            <span>{t('Enable GitLab Sync')}</span>
          </label>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('GitLab Instance URL')}</label>
              <input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 transition-colors" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} placeholder="https://gitlab.example.com" disabled={!config.enabled} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Project ID')}</label>
              <input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 transition-colors" value={config.projectId} onChange={e => setConfig({...config, projectId: e.target.value})} placeholder="e.g. 123456" disabled={!config.enabled} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Personal Access Token')}</label>
              <input type="password" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 transition-colors" value={config.token} onChange={e => setConfig({...config, token: e.target.value})} placeholder="glpat-..." disabled={!config.enabled} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('File Path')}</label>
              <input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 transition-colors" value={config.filePath} onChange={e => setConfig({...config, filePath: e.target.value})} placeholder="ipam/data.json" disabled={!config.enabled} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Branch')}</label>
              <input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50 transition-colors" value={config.branch} onChange={e => setConfig({...config, branch: e.target.value})} placeholder="main" disabled={!config.enabled} />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">{t('Cancel')}</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">{t('Save Settings')}</button>
        </div>
      </div>
    </div>
  );
}
