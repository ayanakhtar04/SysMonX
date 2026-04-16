export interface ParsedCpuMetrics {
  idleSeconds: number;
  totalSeconds: number;
}

export interface ParsedMemoryMetrics {
  totalBytes: number;
  availableBytes: number;
}

export interface ParsedDiskMetrics {
  totalBytes: number;
  availableBytes: number;
}

export interface ParsedNetworkMetrics {
  receiveBytesTotal: number;
  transmitBytesTotal: number;
}

export interface ParsedMetricsSnapshot {
  cpu: ParsedCpuMetrics | null;
  memory: ParsedMemoryMetrics | null;
  disk: ParsedDiskMetrics | null;
  network: ParsedNetworkMetrics | null;
}

export interface VmMetricsResponse {
  cpuUsage: number;
  memory: {
    used: number;
    total: number;
  };
  disk: {
    used: number;
    total: number;
  };
  network: {
    rx: number;
    tx: number;
  };
  healthScore: number;
  timestamp: string;
}

export type VmStatus = 'healthy' | 'warning' | 'critical';

export interface VmStatusResponse {
  status: VmStatus;
}
