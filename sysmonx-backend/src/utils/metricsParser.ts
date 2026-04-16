import type {
  ParsedCpuMetrics,
  ParsedDiskMetrics,
  ParsedMemoryMetrics,
  ParsedMetricsSnapshot,
  ParsedNetworkMetrics,
} from '../types/metrics.types';

interface MetricSample {
  metric: string;
  labels: Record<string, string>;
  value: number;
}

const parseLine = (line: string): MetricSample | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const spaceIndex = trimmed.lastIndexOf(' ');
  if (spaceIndex === -1) {
    return null;
  }

  const metricAndLabels = trimmed.slice(0, spaceIndex);
  const valueStr = trimmed.slice(spaceIndex + 1);

  const value = Number(valueStr);
  if (Number.isNaN(value)) {
    return null;
  }

  const labelStart = metricAndLabels.indexOf('{');
  const labelEnd = metricAndLabels.indexOf('}');

  if (labelStart === -1 || labelEnd === -1 || labelEnd < labelStart) {
    return {
      metric: metricAndLabels,
      labels: {},
      value,
    };
  }

  const metric = metricAndLabels.slice(0, labelStart);
  const labelsContent = metricAndLabels.slice(labelStart + 1, labelEnd);
  const labels: Record<string, string> = {};

  for (const part of labelsContent.split(',')) {
    const [rawKey, rawValue] = part.split('=');
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim();
    let valueToken = rawValue.trim();
    if (valueToken.startsWith('"') && valueToken.endsWith('"')) {
      valueToken = valueToken.slice(1, -1);
    }
    labels[key] = valueToken;
  }

  return { metric, labels, value };
};

const parseCpuMetrics = (samples: MetricSample[]): ParsedCpuMetrics | null => {
  const cpuSamples = samples.filter((s) => s.metric === 'node_cpu_seconds_total');
  if (cpuSamples.length === 0) {
    return null;
  }

  let idleSeconds = 0;
  let totalSeconds = 0;
  for (const sample of cpuSamples) {
    totalSeconds += sample.value;
    if (sample.labels.mode === 'idle') {
      idleSeconds += sample.value;
    }
  }
  if (totalSeconds <= 0) {
    return null;
  }

  return { idleSeconds, totalSeconds };
};

const parseMemoryMetrics = (samples: MetricSample[]): ParsedMemoryMetrics | null => {
  const totalSample = samples.find((s) => s.metric === 'node_memory_MemTotal_bytes');
  const availableSample = samples.find((s) => s.metric === 'node_memory_MemAvailable_bytes');
  if (!totalSample || !availableSample) {
    return null;
  }
  return { totalBytes: totalSample.value, availableBytes: availableSample.value };
};

const parseDiskMetrics = (samples: MetricSample[]): ParsedDiskMetrics | null => {
  const sizeSamples = samples.filter((s) => s.metric === 'node_filesystem_size_bytes');
  const availSamples = samples.filter((s) => s.metric === 'node_filesystem_avail_bytes');

  const ignoredFstypes = new Set([
    'tmpfs',
    'overlay',
    'squashfs',
    'proc',
    'sysfs',
    'devtmpfs',
    'devpts',
    'cgroup2',
    'nsfs',
    'fuse.gvfsd-fuse',
    'fuse.portal',
    'fuse.vmware-vmblock',
  ]);

  const isUsableFilesystemSample = (s: MetricSample): boolean => {
    const { mountpoint, fstype, device_error: deviceError } = s.labels;
    if (!mountpoint) return false;
    if (deviceError && deviceError !== '') return false;
    if (fstype && ignoredFstypes.has(fstype)) return false;
    if (!Number.isFinite(s.value) || s.value <= 0) return false;
    return true;
  };

  const usableSizeSamples = sizeSamples.filter(isUsableFilesystemSample);
  const usableAvailSamples = availSamples.filter(isUsableFilesystemSample);

  const sizeByMountpoint = new Map<string, MetricSample>();
  for (const sample of usableSizeSamples) {
    sizeByMountpoint.set(sample.labels.mountpoint as string, sample);
  }

  const availByMountpoint = new Map<string, MetricSample>();
  for (const sample of usableAvailSamples) {
    availByMountpoint.set(sample.labels.mountpoint as string, sample);
  }

  const commonMountpoints = [...sizeByMountpoint.keys()].filter((mountpoint) => availByMountpoint.has(mountpoint));

  if (commonMountpoints.length === 0) {
    return null;
  }

  const selectedMountpoint = commonMountpoints.includes('/') ? '/' : commonMountpoints[0];
  const sizeSample = sizeByMountpoint.get(selectedMountpoint);
  const availSample = availByMountpoint.get(selectedMountpoint);

  if (!sizeSample || !availSample) {
    return null;
  }

  const totalBytes = sizeSample.value;
  const availableBytes = Math.min(availSample.value, totalBytes);

  return { totalBytes, availableBytes };
};

const parseNetworkMetrics = (samples: MetricSample[]): ParsedNetworkMetrics | null => {
  const rxSamples = samples.filter((s) => s.metric === 'node_network_receive_bytes_total');
  const txSamples = samples.filter((s) => s.metric === 'node_network_transmit_bytes_total');
  if (rxSamples.length === 0 || txSamples.length === 0) {
    return null;
  }

  const isPhysicalInterface = (s: MetricSample): boolean => {
    const device = s.labels.device ?? '';
    if (!device) return false;
    const excludedPrefixes = ['lo', 'docker', 'br-', 'veth', 'cali', 'flannel'];
    return !excludedPrefixes.some((prefix) => device.startsWith(prefix));
  };

  const filteredRx = rxSamples.filter(isPhysicalInterface);
  const filteredTx = txSamples.filter(isPhysicalInterface);

  const effectiveRx = filteredRx.length > 0 ? filteredRx : rxSamples;
  const effectiveTx = filteredTx.length > 0 ? filteredTx : txSamples;

  const receiveBytesTotal = effectiveRx.reduce((sum, s) => sum + s.value, 0);
  const transmitBytesTotal = effectiveTx.reduce((sum, s) => sum + s.value, 0);

  return { receiveBytesTotal, transmitBytesTotal };
};

export const parseMetricsText = (text: string): ParsedMetricsSnapshot => {
  const lines = text.split(/\r?\n/);
  const samples: MetricSample[] = [];

  for (const line of lines) {
    const sample = parseLine(line);
    if (sample) {
      samples.push(sample);
    }
  }

  const cpu = parseCpuMetrics(samples);
  const memory = parseMemoryMetrics(samples);
  const disk = parseDiskMetrics(samples);
  const network = parseNetworkMetrics(samples);

  return { cpu, memory, disk, network };
};
