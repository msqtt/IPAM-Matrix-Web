import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useIPAM } from '../store/IPAMContext';
import { isValidCIDR, BaseNetwork, getSize, formatNumber } from '../lib/ipam';
import { X } from 'lucide-react';

export function BaseNetworkModal({ onClose, editData = null }: { onClose: () => void, editData?: BaseNetwork | null }) {
  const { t } = useTranslation();
  const { addBaseNetwork, updateBaseNetwork } = useIPAM();
  const [formData, setFormData] = useState({
    cidr: editData?.cidr || '',
    description: editData?.description || ''
  });
  const [error, setError] = useState<string | null>(null);

  const ipCount = useMemo(() => {
    if (isValidCIDR(formData.cidr)) {
      return getSize(formData.cidr);
    }
    return null;
  }, [formData.cidr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidCIDR(formData.cidr)) {
      setError(t("Invalid CIDR format"));
      return;
    }

    try {
      if (editData) {
        await updateBaseNetwork(editData.cidr, formData);
      } else {
        await addBaseNetwork(formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 transition-colors">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{editData ? t('Edit Base Network') : t('Add Base Network')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg border border-red-100 dark:border-red-800">{error}</div>}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('CIDR Range')}*</label>
              <input required type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={formData.cidr} onChange={e => setFormData({...formData, cidr: e.target.value})} placeholder="e.g. 10.133.0.0/16" />
              {ipCount !== null && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  {t('Total IPs included')}: {formatNumber(ipCount)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Network Description')}</label>
              <input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Core Network" />
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">{t('Cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">{t('Save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
