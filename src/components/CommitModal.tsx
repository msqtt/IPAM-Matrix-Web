import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useIPAM } from '../store/IPAMContext';

export function CommitModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { commitToGitlab, data, remoteData } = useIPAM();
  const [message, setMessage] = useState(() => {
    const today = new Date().toLocaleString();
    let msg = `Update IPAM records - ${today}\n\n`;

    if (remoteData) {
      const addedBases = data.baseNetworks.filter(b => !remoteData.baseNetworks.some(rb => rb.cidr === b.cidr));
      const removedBases = remoteData.baseNetworks.filter(rb => !data.baseNetworks.some(b => b.cidr === rb.cidr));
      const addedAllocs = data.allocations.filter(a => !remoteData.allocations.some(ra => ra.id === a.id));
      const removedAllocs = remoteData.allocations.filter(ra => !data.allocations.some(a => a.id === ra.id));

      if (addedBases.length > 0) msg += `Added Base Networks: ${addedBases.map(b => b.cidr).join(', ')}\n`;
      if (removedBases.length > 0) msg += `Removed Base Networks: ${removedBases.map(b => b.cidr).join(', ')}\n`;
      if (addedAllocs.length > 0) msg += `Added Allocations: ${addedAllocs.map(a => a.cidr).join(', ')}\n`;
      if (removedAllocs.length > 0) msg += `Removed Allocations: ${removedAllocs.map(a => a.cidr).join(', ')}\n`;
      
      if (!addedBases.length && !removedBases.length && !addedAllocs.length && !removedAllocs.length) {
         msg += `Modified existing records.\n`;
      }
    } else {
      msg += `Initial commit or sync from Web UI.\n`;
    }

    msg += `\nOperator: System User`;
    return msg.trim();
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await commitToGitlab(message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to commit');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('Commit Changes')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg border border-red-100 dark:border-red-800">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Commit Message')}</label>
            <textarea
              required
              rows={3}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              {t('Cancel')}
            </button>
            <button disabled={isSubmitting} type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50">
              {isSubmitting ? t('Committing...') : t('Commit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
