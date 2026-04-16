import axios from 'axios';
import { parseMetricsText } from '../utils/metricsParser';
import { calculateHealthScore } from '../utils/healthCalculator';
import type { VmMetricsResponse, VmStatusResponse } from '../types/metrics.types';

const NODE_EXPORTER_DEFAULT_PORT = 9100;

export class MetricsService {
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

    const now = new Date().toISOString();

    const cpuUsage = parsedSnapshot.cpu
      ? ((parsedSnapshot.cpu.totalSeconds - parsedSnapshot.cpu.idleSeconds) /
          parsedSnapshot.cpu.totalSeconds) * 100
      : 0;

    const totalMemory = parsedSnapshot.memory?.totalBytes ?? 0;
    const availableMemory = parsedSnapshot.memory?.availableBytes ?? 0;
    const usedMemory = totalMemory > 0 ? totalMemory - availableMemory : 0;

    const totalDisk = parsedSnapshot.disk?.totalBytes ?? 0;
    const availableDisk = parsedSnapshot.disk?.availableBytes ?? 0;
    const usedDisk = totalDisk > 0 ? totalDisk - availableDisk : 0;

    const rx = parsedSnapshot.network?.receiveBytesTotal ?? 0;
    const tx = parsedSnapshot.network?.transmitBytesTotal ?? 0;

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
      healthScore,
      timestamp: now,
    };

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
