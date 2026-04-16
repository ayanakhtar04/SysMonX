import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { vmService } from '../services/vmService';
import type { CreateVmRequest, Vm } from '../types/vm';

interface VmContextValue {
  vmList: Vm[];
  selectedVm: Vm | null;
  isLoading: boolean;
  error: string | null;
  addVm: (payload: CreateVmRequest) => Promise<void>;
  selectVm: (vmId: string) => void;
  refresh: () => Promise<void>;
}

const VmContext = createContext<VmContextValue | undefined>(undefined);

interface VmProviderProps {
  children: React.ReactNode;
}

export const VmProvider: React.FC<VmProviderProps> = ({ children }) => {
  const [vmList, setVmList] = useState<Vm[]>([]);
  const [selectedVm, setSelectedVm] = useState<Vm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadVms = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const vms = await vmService.getVms();
      setVmList(vms);
      if (!selectedVm && vms.length > 0) {
        setSelectedVm(vms[0]);
      } else if (selectedVm) {
        const stillExists = vms.find((vm) => vm.id === selectedVm.id) ?? null;
        setSelectedVm(stillExists ?? vms[0] ?? null);
      }
      setError(null);
    } catch {
      setError('Unable to load VMs from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVms();
  }, []);

  const addVm = async (payload: CreateVmRequest): Promise<void> => {
    setIsLoading(true);
    try {
      const created = await vmService.addVm(payload);
      setVmList((prev) => [...prev, created]);
      setSelectedVm(created);
      setError(null);
    } catch {
      setError('Failed to add VM. Please verify the backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectVm = (vmId: string): void => {
    const found = vmList.find((vm) => vm.id === vmId) ?? null;
    setSelectedVm(found);
  };

  const value: VmContextValue = useMemo(
    () => ({
      vmList,
      selectedVm,
      isLoading,
      error,
      addVm,
      selectVm,
      refresh: loadVms,
    }),
    [vmList, selectedVm, isLoading, error],
  );

  return <VmContext.Provider value={value}>{children}</VmContext.Provider>;
};

export const useVmContext = (): VmContextValue => {
  const context = useContext(VmContext);
  if (!context) {
    throw new Error('useVmContext must be used within a VmProvider');
  }
  return context;
};
