export type VmStatus = 'healthy' | 'warning' | 'critical';

export interface VmStatusResponse {
  status: VmStatus;
}
