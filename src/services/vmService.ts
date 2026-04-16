import { apiClient } from './api';
import type { CreateVmRequest, Vm } from '../types/vm';
import type { VmMetrics } from '../types/metrics';
import type { VmStatusResponse } from '../types/status';

export const vmService = {
  async getVms(): Promise<Vm[]> {
    const response = await apiClient.get<Vm[]>('/api/vms');
    return response.data;
  },

  async addVm(payload: CreateVmRequest): Promise<Vm> {
    const response = await apiClient.post<Vm>('/api/vms', payload);
    return response.data;
  },

  async getVmMetrics(vmId: string): Promise<VmMetrics> {
    const response = await apiClient.get<VmMetrics>(`/api/vms/${vmId}/metrics`);
    return response.data;
  },

  async getVmStatus(vmId: string): Promise<VmStatusResponse> {
    const response = await apiClient.get<VmStatusResponse>(`/api/vms/${vmId}/status`);
    return response.data;
  },
};
