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

  const isRootFilesystem = (s: MetricSample): boolean => {
    const { mountpoint, fstype } = s.labels;
    if (fstype && (fstype === 'tmpfs' || fstype === 'overlay')) return false;
    return mountpoint === '/' || mountpoint === undefined;
  };

  const sizeSample = sizeSamples.find(isRootFilesystem) ?? sizeSamples[0];
  const availSample = availSamples.find(isRootFilesystem) ?? availSamples[0];

  if (!sizeSample || !availSample) {
    return null;
  }

  return { totalBytes: sizeSample.value, availableBytes: availSample.value };
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
