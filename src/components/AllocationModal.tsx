import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useIPAM } from '../store/IPAMContext';
import { isValidCIDR, getSize, formatNumber } from '../lib/ipam';
import { X } from 'lucide-react';

export function AllocationModal({ onClose, initialCidr = '', editData = null }: { onClose: () => void, initialCidr?: string, editData?: any }) {
  const { t } = useTranslation();
  const { addAllocations, updateAllocation } = useIPAM();
  const [formData, setFormData] = useState({
    cidr: editData?.cidr || initialCidr,
    owner: editData?.owner || '',
    purpose: editData?.purpose || '',
    tags: editData?.tags?.join(', ') || ''
  });
  const [error, setError] = useState<string | null>(null);

  const ipCount = useMemo(() => {
    try {
      const cidrs = formData.cidr.split(',').map(c => c.trim()).filter(Boolean);
      if (cidrs.length === 0) return null;
      let total = 0;
      for (const c of cidrs) {
        if (isValidCIDR(c)) {
          total += getSize(c);
        } else {
          return null;
        }
      }
      return total;
    } catch {
      return null;
    }
  }, [formData.cidr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const cidrs = formData.cidr.split(',').map((c: string) => c.trim()).filter(Boolean);
      if (cidrs.length === 0) throw new Error("Please enter at least one CIDR.");
      
      for (const c of cidrs) {
        if (!isValidCIDR(c)) {
          throw new Error(`Invalid CIDR format: ${c}`);
        }
      }

      if (editData) {
        if (cidrs.length > 1) {
          throw new Error("Cannot edit to multiple CIDRs at once.");
        }
        await updateAllocation(editData.id, {
          cidr: cidrs[0],
          owner: formData.owner,
          purpose: formData.purpose,
          tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        });
      } else {
        await addAllocations(cidrs.map((c: string) => ({
          cidr: c,
          owner: formData.owner,
          purpose: formData.purpose,
          tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        })));
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
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{editData ? t('Edit IP Range') : t('Allocate IP Range')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg border border-red-100 dark:border-red-800">{error}</div>}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('CIDR Range')}* {editData ? '' : t('(Multiple allowed, comma separated)')}</label>
              <input required type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={formData.cidr} onChange={e => setFormData({...formData, cidr: e.target.value})} placeholder="e.g. 10.133.1.0/24" />
              {ipCount !== null && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  {t('Total IPs included')}: {formatNumber(ipCount)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Owner (Team/Person)')}*</label>
              <input required type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} placeholder="e.g. Web Infra Team" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Purpose')}*</label>
              <input required type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="e.g. K8s ingress nodes" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('Tags (Comma separated)')}</label>
              <input type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="e.g. prod, dmz, k8s" />
            </div>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end space-x-3 transition-colors">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">{t('Cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">{editData ? t('Edit') : t('Allocate')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
