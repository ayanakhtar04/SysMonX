import { useCallback, useEffect, useMemo, useState } from 'react';
import { vmService } from '../services/vmService';
import type { VmMetrics, MetricsHistoryPoint } from '../types/metrics';
import type { VmStatus } from '../types/status';
import { usePolling } from './usePolling';

interface UseMetricsResult {
  metrics: VmMetrics | null;
  status: VmStatus | null;
  history: MetricsHistoryPoint[];
  isLoading: boolean;
  isError: boolean;
  isMockMode: boolean;
  errorMessage: string | null;
}

const HISTORY_LIMIT = 20;
const MOCK_RETRY_INTERVAL_MS = 15000;

const createMockMetrics = (previous?: VmMetrics | null): VmMetrics => {
  const now = new Date().toISOString();

  const randomWalk = (base: number, variance: number, min: number, max: number): number => {
    const prev = previous?.cpuUsage ?? base;
    const next = prev + (Math.random() * 2 - 1) * variance;
    return Math.min(Math.max(next, min), max);
  };

  const cpuUsage = randomWalk(40, 15, 5, 95);

  const totalMemory = 16 * 1024;
  const usedMemory = totalMemory * (0.3 + Math.random() * 0.6);

  const totalDisk = 256 * 1024;
  const usedDisk = totalDisk * (0.2 + Math.random() * 0.7);

  const prevRx = previous?.network.rx ?? 0;
  const prevTx = previous?.network.tx ?? 0;

  const rx = prevRx + 200 + Math.random() * 800;
  const tx = prevTx + 150 + Math.random() * 600;

  const utilizationScore =
    (cpuUsage * 0.4 + (usedMemory / totalMemory) * 100 * 0.3 + (usedDisk / totalDisk) * 100 * 0.3) / 1.0;
  const healthScore = Math.max(0, 100 - utilizationScore + (Math.random() - 0.5) * 5);

  return {
    cpuUsage,
    memory: {
      used: Math.round(usedMemory),
      total: totalMemory,
    },
    disk: {
      used: Math.round(usedDisk),
      total: totalDisk,
    },
    network: {
      rx,
      tx,
    },
    healthScore,
    timestamp: now,
  };
};

const deriveMockStatus = (metrics: VmMetrics): VmStatus => {
  if (metrics.healthScore >= 80) return 'healthy';
  if (metrics.healthScore >= 50) return 'warning';
  return 'critical';
};

export const useMetrics = (vmId: string | null): UseMetricsResult => {
  const [metrics, setMetrics] = useState<VmMetrics | null>(null);
  const [status, setStatus] = useState<VmStatus | null>(null);
  const [history, setHistory] = useState<MetricsHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [lastApiAttemptAt, setLastApiAttemptAt] = useState<number>(0);

  const appendHistory = useCallback((m: VmMetrics) => {
    setHistory((prev) => {
      const nextPoint: MetricsHistoryPoint = {
        timestamp: m.timestamp,
        cpuUsage: m.cpuUsage,
        rx: m.network.rx,
        tx: m.network.tx,
      };
      const data = [...prev, nextPoint];
      if (data.length > HISTORY_LIMIT) {
        return data.slice(data.length - HISTORY_LIMIT);
      }
      return data;
    });
  }, []);

  const fetchFromApi = useCallback(async () => {
    if (!vmId) return;
    setLastApiAttemptAt(Date.now());
    setIsLoading(true);
    try {
      const [metricsResponse, statusResponse] = await Promise.all([
        vmService.getVmMetrics(vmId),
        vmService.getVmStatus(vmId),
      ]);
      setMetrics(metricsResponse);
      setStatus(statusResponse.status);
      appendHistory(metricsResponse);
      setIsError(false);
      setErrorMessage(null);
      setIsMockMode(false);
    } catch {
      setIsError(true);
      setErrorMessage('Failed to fetch metrics from backend. Switching to mock mode.');
      setIsMockMode(true);
    } finally {
      setIsLoading(false);
    }
  }, [appendHistory, vmId]);

  const generateMock = useCallback(() => {
    setMetrics((prev) => {
      const next = createMockMetrics(prev);
      setStatus(deriveMockStatus(next));
      appendHistory(next);
      return next;
    });
  }, [appendHistory]);

  const tick = useCallback(() => {
    if (!vmId) return;
    if (!isMockMode) {
      void fetchFromApi();
      return;
    }

    generateMock();

    const now = Date.now();
    if (now - lastApiAttemptAt >= MOCK_RETRY_INTERVAL_MS) {
      void fetchFromApi();
    }
  }, [fetchFromApi, generateMock, isMockMode, lastApiAttemptAt, vmId]);

  useEffect(() => {
    if (!vmId) {
      setMetrics(null);
      setStatus(null);
      setHistory([]);
      setIsError(false);
      setErrorMessage(null);
      setIsMockMode(false);
      return;
    }

    setHistory([]);
    setIsMockMode(false);
    void fetchFromApi();
  }, [fetchFromApi, vmId]);

  usePolling(tick, 5000, Boolean(vmId));

  const result: UseMetricsResult = useMemo(
    () => ({ metrics, status, history, isLoading, isError, isMockMode, errorMessage }),
    [metrics, status, history, isLoading, isError, isMockMode, errorMessage],
  );

  return result;
};
