import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, RotateCcw } from 'lucide-react';
import { useIPAM } from '../store/IPAMContext';
import { formatDistanceToNow } from 'date-fns';

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { getCommits, rollbackToVersion } = useIPAM();
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCommits()
      .then(data => setCommits(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [getCommits]);

  const handleRollback = async (ref: string) => {
    if (!window.confirm(t('Are you sure you want to load this historical version? You can preview it and then click Commit to save it permanently.'))) return;
    try {
      await rollbackToVersion(ref);
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('Commit History')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg">{error}</div>}
          
          {loading ? (
            <div className="text-center py-8 text-slate-500">{t('Loading history...')}</div>
          ) : commits.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{t('No history available')}</div>
          ) : (
            commits.map((commit: any) => (
              <div key={commit.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-medium text-slate-800 dark:text-slate-200">{commit.message}</h3>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>{commit.author_name}</span>
                    <span>{formatDistanceToNow(new Date(commit.created_at), { addSuffix: true })}</span>
                    <span className="font-mono text-xs text-slate-400">{commit.short_id}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleRollback(commit.id)}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  title={t('Load this version into the preview')}
                >
                  <RotateCcw size={14} />
                  {t('Rollback')}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
