import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useIPAM } from '../store/IPAMContext';
import { ipToNum, getSize, formatNumber, isSubnet, splitSubnet } from '../lib/ipam';
import { Trash2, Tag, Calendar, User, Info, Map, List, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

function SearchHighlight({ text, search }: { text?: string; search: string }) {
  if (!text) return null;
  if (!search) return <>{text}</>;
  
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };
  
  const parts = text.split(new RegExp(`(${escapeRegExp(search)})`, 'gi'));
  return (
    <>
      {parts.map((p, i) => 
        p.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 bg-opacity-60 dark:bg-opacity-40 rounded-sm px-0.5">{p}</mark>
        ) : (
          p
        )
      )}
    </>
  );
}

export function NetworkVisualizer({ searchQuery, activeTag, onAllocateBase, onEditAllocation }: { searchQuery: string, activeTag: string | null, onAllocateBase: (cidr: string) => void, onEditAllocation?: (alloc: any) => void }) {
  const { t } = useTranslation();
  const { data, removeAllocation } = useIPAM();
  const [viewMode, setViewMode] = useState<'list'|'map'>('list');
  const [collapsedBases, setCollapsedBases] = useState<Set<string>>(new Set());
  const [selectedAllocId, setSelectedAllocId] = useState<string | null>(null);

  const toggleCollapse = (cidr: string) => {
    const next = new Set(collapsedBases);
    if (next.has(cidr)) next.delete(cidr);
    else next.add(cidr);
    setCollapsedBases(next);
  };

  // Helper to filter allocations
  const filteredAllocations = useMemo(() => {
    return data.allocations.filter(alloc => {
      if (activeTag && !alloc.tags.includes(activeTag)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!alloc.cidr.toLowerCase().includes(q) &&
            !alloc.owner.toLowerCase().includes(q) &&
            !alloc.purpose.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data.allocations, activeTag, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2 mb-4">
        <button 
           onClick={() => setViewMode('list')}
           className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <List size={16} />
          {t('List View')}
        </button>
        <button 
           onClick={() => setViewMode('map')}
           className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'map' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <Map size={16} />
          {t('Map View')}
        </button>
      </div>

      <div className="space-y-8">
        {data.baseNetworks.filter(base => {
          if (selectedAllocId) {
            const alloc = data.allocations.find(a => a.id === selectedAllocId);
            if (!alloc || !isSubnet(base.cidr, alloc.cidr)) return false;
          }
          if (searchQuery || activeTag) {
            const hasMatches = filteredAllocations.some(a => isSubnet(base.cidr, a.cidr));
            if (!hasMatches) return false;
          }
          return true;
        }).map(base => {
          // Find all allocations that fit in this base network
          const allocationsInBase = data.allocations.filter(a => isSubnet(base.cidr, a.cidr))
            .sort((a, b) => ipToNum(a.cidr) - ipToNum(b.cidr));
          
          let filteredInBase = filteredAllocations.filter(a => isSubnet(base.cidr, a.cidr))
            .sort((a, b) => ipToNum(a.cidr) - ipToNum(b.cidr));

          if (selectedAllocId) {
            filteredInBase = filteredInBase.filter(a => a.id === selectedAllocId);
          }

          const baseSize = getSize(base.cidr);
          const usedSize = allocationsInBase.reduce((acc, curr) => acc + getSize(curr.cidr), 0);
          const usagePercent = (usedSize / baseSize) * 100;
          const isCollapsed = collapsedBases.has(base.cidr);

          return (
            <div key={base.cidr} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => toggleCollapse(base.cidr)}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                      {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </button>
                    <div>
                      <h3 className="text-xl font-bold font-mono text-slate-800 dark:text-white flex items-center gap-2">
                        <SearchHighlight text={base.cidr} search={searchQuery} />
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {base.description ? <span className="font-medium text-slate-600 dark:text-slate-300 mr-2"><SearchHighlight text={base.description} search={searchQuery} /></span> : null}
                        {t('Base Network Capacity')}: {formatNumber(baseSize)} {t('IPs')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatNumber(usedSize)} {t('Allocated')}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{usagePercent.toFixed(2)}% {t('Used')}</div>
                  </div>
                </div>
                
                {!isCollapsed && viewMode === 'list' && (
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-3 flex transition-colors">
                    {baseSize > 0 && allocationsInBase.map(alloc => {
                      const allocSize = getSize(alloc.cidr);
                      // Minimal visual width is 1% so it's always visible if very small
                      let widthPct = (allocSize / baseSize) * 100;
                      if (widthPct < 0.5) widthPct = 0.5;
                      
                      return (
                        <div 
                          key={alloc.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAllocId(selectedAllocId === alloc.id ? null : alloc.id);
                          }}
                          className={`h-full border-r border-white/20 bg-blue-500 hover:bg-blue-600 transition-all cursor-pointer ${selectedAllocId && selectedAllocId !== alloc.id ? 'opacity-30' : 'opacity-100'}`}
                          style={{ width: `${widthPct}%` }}
                          title={`${alloc.cidr} - ${alloc.owner}`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <>
                  {viewMode === 'list' ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredInBase.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No allocations match the criteria in this network.</div>
                  ) : (
                    filteredInBase.map(alloc => (
                      <div key={alloc.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                              <SearchHighlight text={alloc.cidr} search={searchQuery} />
                            </span>
                            <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                              {formatNumber(getSize(alloc.cidr))} {t('IPs')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <User size={16} className="text-slate-400 dark:text-slate-500" />
                              <span className="font-medium text-slate-900 dark:text-slate-200"><SearchHighlight text={alloc.owner} search={searchQuery} /></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Info size={16} className="text-slate-400 dark:text-slate-500" />
                              <span><SearchHighlight text={alloc.purpose} search={searchQuery} /></span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
                              <span>{format(alloc.createdAt, 'MMM d, yyyy')}</span>
                            </div>
                          </div>

                          {alloc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {alloc.tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-md">
                                  <Tag size={12} />
                                  <SearchHighlight text={tag} search={searchQuery} />
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-1">
                          <button 
                            onClick={() => onEditAllocation?.(alloc)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title={t('Edit IP Range')}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              if(window.confirm(`${t('Are you sure you want to release')} ${alloc.cidr}?`)) {
                                removeAllocation(alloc.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title={t('Release IP Range')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <MapGridView 
                  base={base.cidr} 
                  allocationsInBase={allocationsInBase} 
                  onAllocateBase={onAllocateBase} 
                  t={t} 
                />
              )}
                </>
              )}
            </div>
          );
        })}
        
        {data.baseNetworks.length === 0 && (
          <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed transition-colors">
            <p className="text-slate-500 dark:text-slate-400">{t('No base networks configured.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MapGridView({ 
  base, 
  allocationsInBase, 
  onAllocateBase,
  t
}: { 
  base: string, 
  allocationsInBase: any[], 
  onAllocateBase: (cidr: string) => void,
  t: any
}) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const basePrefix = parseInt(base.split('/')[1]);
  const [splitTarget, setSplitTarget] = useState(Math.min(32, basePrefix + 8));

  const validOptions = [];
  for (let i = 1; i <= Math.min(12, 32 - basePrefix); i++) {
    validOptions.push(basePrefix + i);
  }

  const subnets = useMemo(() => splitSubnet(base, splitTarget), [base, splitTarget]);

  const gridBlocks = useMemo(() => {
    return subnets.map(subCidr => {
      const subSize = getSize(subCidr);
      const containedBy = allocationsInBase.find(a => isSubnet(a.cidr, subCidr) || a.cidr === subCidr);
      if (containedBy) {
        return { cidr: subCidr, status: 'used', alloc: containedBy };
      }
      const insideAllocations = allocationsInBase.filter(a => isSubnet(subCidr, a.cidr));
      if (insideAllocations.length === 0) {
        return { cidr: subCidr, status: 'free' };
      }
      const usedInside = insideAllocations.reduce((acc, curr) => acc + getSize(curr.cidr), 0);
      return { cidr: subCidr, status: usedInside >= subSize ? 'used' : 'partial' };
    });
  }, [subnets, allocationsInBase]);

  const handleMouseDown = (index: number, status: string) => {
    if (status !== 'free') return;
    setIsSelecting(true);
    setStartIndex(index);
    setCurrentIndex(index);
  };

  const handleMouseEnter = (index: number) => {
    if (isSelecting) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting && startIndex !== null && currentIndex !== null) {
        const min = Math.min(startIndex, currentIndex);
        const max = Math.max(startIndex, currentIndex);
        
        let valid = true;
        const selectedCidrs = [];
        for (let i = min; i <= max; i++) {
          if (gridBlocks[i].status !== 'free') valid = false;
          selectedCidrs.push(gridBlocks[i].cidr);
        }

        if (valid && selectedCidrs.length > 0) {
          onAllocateBase(selectedCidrs.join(', '));
        }
        setIsSelecting(false);
        setStartIndex(null);
        setCurrentIndex(null);
      } else if (isSelecting) {
        setIsSelecting(false);
        setStartIndex(null);
        setCurrentIndex(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, startIndex, currentIndex, gridBlocks, onAllocateBase]);

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('Subnets breakdown')}</h4>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('Subnet Prefix')}</label>
          <select 
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={splitTarget}
            onChange={(e) => setSplitTarget(Number(e.target.value))}
          >
            {validOptions.map(opt => (
              <option key={opt} value={opt}>/{opt} ({formatNumber(getSize(base.split('/')[0] + '/' + opt))} IPs)</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-1 mb-4 select-none">
        {gridBlocks.map((block, index) => {
          let isSelected = false;
          if (isSelecting && startIndex !== null && currentIndex !== null) {
            const min = Math.min(startIndex, currentIndex);
            const max = Math.max(startIndex, currentIndex);
            if (index >= min && index <= max) isSelected = true;
          }

          let bgColor = 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'; // free
          if (block.status === 'used') bgColor = 'bg-red-500 hover:bg-red-600';
          else if (block.status === 'partial') bgColor = 'bg-yellow-400 hover:bg-yellow-500';

          if (isSelected) {
            bgColor = 'bg-blue-400 dark:bg-blue-500';
          }

          return (
            <div 
              key={block.cidr}
              title={`${block.cidr} - ${t(block.status.charAt(0).toUpperCase() + block.status.slice(1))} ${block.alloc ? `(${block.alloc.owner})` : ''}`}
              onMouseDown={() => handleMouseDown(index, block.status)}
              onMouseEnter={() => handleMouseEnter(index)}
              className={`aspect-square rounded-sm transition-colors cursor-pointer ${bgColor} ${block.status !== 'free' && !isSelecting ? 'cursor-not-allowed' : ''} ${isSelected ? 'ring-2 ring-blue-600 z-10 scale-110 shadow-sm' : ''}`}
            />
          );
        })}
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700"/> {t('Free')}
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-yellow-400"/> {t('Partially Used')}
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-red-500"/> {t('Used')}
        </div>
      </div>
    </div>
  );
}
