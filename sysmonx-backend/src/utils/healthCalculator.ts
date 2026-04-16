import type { ParsedMetricsSnapshot, VmStatus } from '../types/metrics.types';

interface UtilizationComponents {
  cpuUtilization: number;
  memoryUtilization: number;
  diskUtilization: number;
  networkUtilization: number;
}

const CPU_WEIGHT = 0.4;
const MEMORY_WEIGHT = 0.3;
const DISK_WEIGHT = 0.2;
const NETWORK_WEIGHT = 0.1;

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const deriveUtilization = (snapshot: ParsedMetricsSnapshot): UtilizationComponents => {
  let cpuUtilization = 0;
  if (snapshot.cpu && snapshot.cpu.totalSeconds > 0) {
    const busy = snapshot.cpu.totalSeconds - snapshot.cpu.idleSeconds;
    cpuUtilization = clamp((busy / snapshot.cpu.totalSeconds) * 100, 0, 100);
  }

  let memoryUtilization = 0;
  if (snapshot.memory && snapshot.memory.totalBytes > 0) {
    const used = snapshot.memory.totalBytes - snapshot.memory.availableBytes;
    memoryUtilization = clamp((used / snapshot.memory.totalBytes) * 100, 0, 100);
  }

  let diskUtilization = 0;
  if (snapshot.disk && snapshot.disk.totalBytes > 0) {
    const used = snapshot.disk.totalBytes - snapshot.disk.availableBytes;
    diskUtilization = clamp((used / snapshot.disk.totalBytes) * 100, 0, 100);
  }

  // For a single snapshot, network utilization is difficult to quantify.
  // Here we approximate it with a normalized score based on total bytes.
  let networkUtilization = 0;
  if (snapshot.network) {
    const totalBytes = snapshot.network.receiveBytesTotal + snapshot.network.transmitBytesTotal;
    const referenceHigh = 10 * 1024 * 1024 * 1024; // 10 GiB reference upper bound
    const ratio = totalBytes / referenceHigh;
    networkUtilization = clamp(ratio * 100, 0, 100);
  }

  return { cpuUtilization, memoryUtilization, diskUtilization, networkUtilization };
};

export const calculateHealthScore = (snapshot: ParsedMetricsSnapshot): { healthScore: number; status: VmStatus } => {
  const { cpuUtilization, memoryUtilization, diskUtilization, networkUtilization } = deriveUtilization(snapshot);

  const weightedUtilization =
    cpuUtilization * CPU_WEIGHT +
    memoryUtilization * MEMORY_WEIGHT +
    diskUtilization * DISK_WEIGHT +
    networkUtilization * NETWORK_WEIGHT;

  const rawHealth = 100 - weightedUtilization;
  const healthScore = clamp(rawHealth, 0, 100);

  let status: VmStatus;
  if (healthScore >= 80) {
    status = 'healthy';
  } else if (healthScore >= 50) {
    status = 'warning';
  } else {
    status = 'critical';
  }

  return { healthScore, status };
};
