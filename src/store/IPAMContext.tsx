import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { IPAMData, Allocation, BaseNetwork, isOverlap, isSubnet } from '../lib/ipam';

export function normalizeData(data: any): IPAMData {
  if (!data) return defaultData;
  return {
    ...data,
    baseNetworks: (data.baseNetworks || []).map((b: any) => 
      typeof b === 'string' ? { cidr: b, description: '' } : b
    ),
    allocations: data.allocations || []
  };
}
import { GitlabConfig, defaultGitlabConfig, fetchFromGitlab, saveToGitlab, getGitlabCommits } from '../lib/gitlab';

interface IPAMContextType {
  data: IPAMData;
  remoteData: IPAMData | null;
  isLoading: boolean;
  error: string | null;
  gitlabConfig: GitlabConfig;
  setGitlabConfig: (config: GitlabConfig) => void;
  addAllocation: (alloc: Omit<Allocation, 'id' | 'createdAt'>) => Promise<void>;
  addAllocations: (allocs: Omit<Allocation, 'id' | 'createdAt'>[]) => Promise<void>;
  updateAllocation: (id: string, alloc: Partial<Allocation>) => Promise<void>;
  removeAllocation: (id: string) => Promise<void>;
  addBaseNetwork: (network: BaseNetwork) => Promise<void>;
  updateBaseNetwork: (oldCidr: string, network: BaseNetwork) => Promise<void>;
  removeBaseNetwork: (cidr: string) => Promise<void>;
  importData: (data: IPAMData) => Promise<void>;
  refresh: () => Promise<void>;
  commitToGitlab: (message: string) => Promise<void>;
  rollbackToVersion: (ref: string) => Promise<void>;
  getCommits: () => Promise<any[]>;
}

const defaultData: IPAMData = {
  baseNetworks: [],
  allocations: []
};

const IPAMContext = createContext<IPAMContextType | null>(null);

export function IPAMProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<IPAMData>(defaultData);
  const [remoteData, setRemoteData] = useState<IPAMData | null>(null);
  const [gitlabConfig, setGitlabConfig] = useState<GitlabConfig>(() => {
    const saved = localStorage.getItem('gitlabConfig');
    return saved ? JSON.parse(saved) : defaultGitlabConfig;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    // Also try to load local data
    const localData = localStorage.getItem('ipamData');
    if (localData && !gitlabConfig.enabled) {
      setData(normalizeData(JSON.parse(localData)));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!gitlabConfig.enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const gitlabData = await fetchFromGitlab(gitlabConfig);
      if (gitlabData) {
        const normalized = normalizeData(gitlabData);
        setData(normalized);
        setRemoteData(normalized);
        localStorage.setItem('ipamData', JSON.stringify(normalized));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [gitlabConfig]);

  useEffect(() => {
    if (gitlabConfig.enabled) {
      refresh();
    }
  }, [gitlabConfig.enabled, refresh]);

  const saveAndSync = async (newData: IPAMData) => {
    setData(newData);
    localStorage.setItem('ipamData', JSON.stringify(newData));
  };

  const commitToGitlab = async (message: string) => {
    if (!gitlabConfig.enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      await saveToGitlab(gitlabConfig, data, message);
      setRemoteData(data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const rollbackToVersion = async (ref: string) => {
    if (!gitlabConfig.enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const historicalData = await fetchFromGitlab(gitlabConfig, ref);
      if (historicalData) {
        const normalized = normalizeData(historicalData);
        setData(normalized);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getCommits = async () => {
    if (!gitlabConfig.enabled) return [];
    return await getGitlabCommits(gitlabConfig);
  };


  const addAllocations = async (allocs: Omit<Allocation, 'id' | 'createdAt'>[]) => {
    let currentAllocations = [...data.allocations];
    
    for (const alloc of allocs) {
      const insideBase = data.baseNetworks.some(base => isSubnet(base.cidr, alloc.cidr));
      if (!insideBase) {
        throw new Error(`CIDR ${alloc.cidr} is not within any base network.`);
      }

      const overlap = currentAllocations.find(existing => isOverlap(existing.cidr, alloc.cidr));
      if (overlap) {
        throw new Error(`CIDR overlaps with existing allocation: ${overlap.cidr} (${overlap.owner})`);
      }

      const newAlloc: Allocation = {
        ...alloc,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      };
      
      currentAllocations.push(newAlloc);
    }

    await saveAndSync({
      ...data,
      allocations: currentAllocations
    });
  };

  const addAllocation = async (alloc: Omit<Allocation, 'id' | 'createdAt'>) => {
    await addAllocations([alloc]);
  };

  const updateAllocation = async (id: string, updatedFields: Partial<Allocation>) => {
    let currentAllocations = [...data.allocations];
    const index = currentAllocations.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Allocation not found");

    const oldAlloc = currentAllocations[index];
    const newAlloc = { ...oldAlloc, ...updatedFields } as Allocation;

    if (updatedFields.cidr && updatedFields.cidr !== oldAlloc.cidr) {
        const insideBase = data.baseNetworks.some(base => isSubnet(base.cidr, newAlloc.cidr));
        if (!insideBase) {
          throw new Error(`CIDR ${newAlloc.cidr} is not within any base network.`);
        }

        const overlap = currentAllocations.find(existing => existing.id !== id && isOverlap(existing.cidr, newAlloc.cidr));
        if (overlap) {
          throw new Error(`CIDR overlaps with existing allocation: ${overlap.cidr} (${overlap.owner})`);
        }
    }

    currentAllocations[index] = newAlloc;

    await saveAndSync({
      ...data,
      allocations: currentAllocations
    });
  };

  const removeAllocation = async (id: string) => {
    await saveAndSync({
      ...data,
      allocations: data.allocations.filter(a => a.id !== id)
    });
  };

  const addBaseNetwork = async (network: BaseNetwork) => {
    if (data.baseNetworks.some(b => b.cidr === network.cidr)) {
      throw new Error("Base network already exists");
    }
    await saveAndSync({
      ...data,
      baseNetworks: [...data.baseNetworks, network]
    });
  };

  const updateBaseNetwork = async (oldCidr: string, network: BaseNetwork) => {
    const newNetworks = data.baseNetworks.map(b => b.cidr === oldCidr ? network : b);
    await saveAndSync({
      ...data,
      baseNetworks: newNetworks
    });
  };

  const removeBaseNetwork = async (cidr: string) => {
    await saveAndSync({
      ...data,
      baseNetworks: data.baseNetworks.filter(b => b.cidr !== cidr)
    });
  };

  const importData = async (importedData: IPAMData) => {
    await saveAndSync(normalizeData(importedData));
  };

  const handleSetGitlabConfig = (newConfig: GitlabConfig) => {
    setGitlabConfig(newConfig);
    localStorage.setItem('gitlabConfig', JSON.stringify(newConfig));
  };

  return (
    <IPAMContext.Provider value={{
      data, remoteData, isLoading, error, gitlabConfig, setGitlabConfig: handleSetGitlabConfig,
      addAllocation, addAllocations, updateAllocation, removeAllocation, addBaseNetwork, updateBaseNetwork, removeBaseNetwork, importData, refresh, commitToGitlab, rollbackToVersion, getCommits
    }}>
      {children}
    </IPAMContext.Provider>
  );
}

export function useIPAM() {
  const ctx = useContext(IPAMContext);
  if (!ctx) throw new Error("useIPAM must be used within IPAMProvider");
  return ctx;
}
