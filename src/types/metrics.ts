export interface MemoryMetrics {
  used: number;
  total: number;
}

export interface DiskMetrics {
  used: number;
  total: number;
}

export interface NetworkMetrics {
  rx: number;
  tx: number;
}

export interface VmMetrics {
  cpuUsage: number;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  healthScore: number;
  timestamp: string;
}

export interface MetricsHistoryPoint {
  timestamp: string;
  cpuUsage: number;
  rx: number;
  tx: number;
}
