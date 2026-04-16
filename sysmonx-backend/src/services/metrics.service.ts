import axios from 'axios';
import { parseMetricsText } from '../utils/metricsParser';
import { calculateHealthScore } from '../utils/healthCalculator';
import type { VmMetricsResponse, VmStatusResponse } from '../types/metrics.types';

const NODE_EXPORTER_DEFAULT_PORT = 9100;

export class MetricsService {
  private lastValidMetricsByIp = new Map<string, VmMetricsResponse>();

  async fetchMetricsForIp(ip: string): Promise<VmMetricsResponse> {
    const port = process.env.NODE_EXPORTER_PORT
      ? Number(process.env.NODE_EXPORTER_PORT)
      : NODE_EXPORTER_DEFAULT_PORT;

    const url = `http://${ip}:${port}/metrics`;

    const response = await axios.get<string>(url, {
      timeout: 5000,
      responseType: 'text',
      transformResponse: (data) => data,
    });

    const rawText = response.data;
    const parsedSnapshot = parseMetricsText(rawText);
    const { healthScore } = calculateHealthScore(parsedSnapshot);
    const lastValid = this.lastValidMetricsByIp.get(ip);

    const now = new Date().toISOString();

    const parsedCpuUsage = parsedSnapshot.cpu
      ? ((parsedSnapshot.cpu.totalSeconds - parsedSnapshot.cpu.idleSeconds) /
          parsedSnapshot.cpu.totalSeconds) * 100
      : 0;
    const cpuUsage = parsedSnapshot.cpu
      ? parsedCpuUsage
      : (lastValid?.cpuUsage ?? 0);

    const parsedTotalMemory = parsedSnapshot.memory?.totalBytes ?? 0;
    const parsedAvailableMemory = parsedSnapshot.memory?.availableBytes ?? 0;
    const hasValidMemory = parsedTotalMemory > 0;
    const totalMemory = hasValidMemory ? parsedTotalMemory : (lastValid?.memory.total ?? 0);
    const usedMemory = hasValidMemory
      ? Math.max(parsedTotalMemory - parsedAvailableMemory, 0)
      : (lastValid?.memory.used ?? 0);

    const parsedTotalDisk = parsedSnapshot.disk?.totalBytes ?? 0;
    const parsedAvailableDisk = parsedSnapshot.disk?.availableBytes ?? 0;
    const hasValidDisk = parsedTotalDisk > 0;
    const totalDisk = hasValidDisk ? parsedTotalDisk : (lastValid?.disk.total ?? 0);
    const usedDisk = hasValidDisk
      ? Math.max(parsedTotalDisk - parsedAvailableDisk, 0)
      : (lastValid?.disk.used ?? 0);

    const hasValidNetwork = Boolean(parsedSnapshot.network);
    const rx = hasValidNetwork
      ? (parsedSnapshot.network?.receiveBytesTotal ?? 0)
      : (lastValid?.network.rx ?? 0);
    const tx = hasValidNetwork
      ? (parsedSnapshot.network?.transmitBytesTotal ?? 0)
      : (lastValid?.network.tx ?? 0);

    const hasMissingComponent = !parsedSnapshot.cpu || !hasValidMemory || !hasValidDisk || !hasValidNetwork;
    const resolvedHealthScore = hasMissingComponent && lastValid
      ? lastValid.healthScore
      : healthScore;

    const metrics: VmMetricsResponse = {
      cpuUsage,
      memory: {
        used: usedMemory,
        total: totalMemory,
      },
      disk: {
        used: usedDisk,
        total: totalDisk,
      },
      network: {
        rx,
        tx,
      },
      healthScore: resolvedHealthScore,
      timestamp: now,
    };

    this.lastValidMetricsByIp.set(ip, metrics);

    // The status endpoint uses the same health calculation; this allows
    // controllers to reuse logic when needed.
    return metrics;
  }

  async fetchStatusForIp(ip: string): Promise<VmStatusResponse> {
    const metrics = await this.fetchMetricsForIp(ip);

    let status: VmStatusResponse['status'];
    if (metrics.healthScore >= 80) {
      status = 'healthy';
    } else if (metrics.healthScore >= 50) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return { status };
  }
}

export const metricsService = new MetricsService();
