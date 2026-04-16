import { useEffect, useMemo, useState } from 'react';
import { useVmContext } from '../context/VmContext';
import { useMetrics } from '../hooks/useMetrics';
import { usePredictions } from '../hooks/usePredictions';
import { CpuChart } from '../components/charts/CpuChart';
import { MemoryChart } from '../components/charts/MemoryChart';
import { DiskChart } from '../components/charts/DiskChart';
import { NetworkChart } from '../components/charts/NetworkChart';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Spinner } from '../components/ui/Spinner';
import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PredictionMetric } from '../types/predictions';

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(2)}%`;
};

const formatGiB = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  const gib = value / (1024 * 1024 * 1024);
  return `${gib.toFixed(2)} GiB`;
};

const formatDelta = (realtime: number | null, predicted: number | null): string => {
  if (realtime === null || predicted === null) return 'N/A';
  const delta = predicted - realtime;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}%`;
};

type DashboardViewMode = 'compact' | 'expanded';

const DASHBOARD_VIEW_MODE_STORAGE_KEY = 'sysmonx.dashboard.viewMode';

const getFreshnessMeta = (
  isoTimestamp: string | null | undefined,
): { label: string; className: string } => {
  if (!isoTimestamp) {
    return {
      label: 'No data',
      className: 'text-slate-300 bg-slate-900/60 border border-slate-700/70',
    };
  }

  const timestampMs = new Date(isoTimestamp).getTime();
  if (Number.isNaN(timestampMs)) {
    return {
      label: 'Invalid timestamp',
      className: 'text-rose-300 bg-rose-950/40 border border-rose-500/40',
    };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));

  if (ageSeconds <= 15) {
    return {
      label: `Fresh (${ageSeconds}s)` ,
      className: 'text-emerald-200 bg-emerald-950/40 border border-emerald-500/40',
    };
  }

  if (ageSeconds <= 35) {
    return {
      label: `Recent (${ageSeconds}s)`,
      className: 'text-amber-200 bg-amber-950/40 border border-amber-500/40',
    };
  }

  return {
    label: `Stale (${ageSeconds}s)`,
    className: 'text-rose-200 bg-rose-950/40 border border-rose-500/40',
  };
};

export const DashboardPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<DashboardViewMode>(() => {
    const storedMode = window.localStorage.getItem(DASHBOARD_VIEW_MODE_STORAGE_KEY);
    return storedMode === 'compact' || storedMode === 'expanded' ? storedMode : 'expanded';
  });
  const { selectedVm } = useVmContext();
  const { metrics, status, history, isLoading, isError, isMockMode, errorMessage } = useMetrics(
    selectedVm?.id ?? null,
  );
  const {
    predictionSnapshot,
    isLoading: isPredictionLoading,
    isError: isPredictionError,
    isWarmingUp: isPredictionWarmingUp,
    message: predictionMessage,
  } = usePredictions(Boolean(selectedVm));

  const healthScore = metrics?.healthScore ?? 0;

  const memoryPercent = metrics && metrics.memory.total > 0
    ? (metrics.memory.used / metrics.memory.total) * 100
    : null;
  const diskPercent = metrics && metrics.disk.total > 0
    ? (metrics.disk.used / metrics.disk.total) * 100
    : null;

  const realtimeByMetric: Record<PredictionMetric, number | null> = {
    cpu: metrics?.cpuUsage ?? null,
    memory: memoryPercent,
    disk: diskPercent,
  };

  const predictionCards: Array<{ key: PredictionMetric; label: string }> = [
    { key: 'cpu', label: 'CPU' },
    { key: 'memory', label: 'Memory' },
    { key: 'disk', label: 'Disk' },
  ];

  const lastSampleText = metrics ? new Date(metrics.timestamp).toLocaleTimeString() : 'Awaiting metrics...';
  const predictionSampleText = predictionSnapshot
    ? new Date(predictionSnapshot.timestamp).toLocaleTimeString()
    : 'N/A';
  const realtimeFreshness = getFreshnessMeta(metrics?.timestamp ?? null);
  const aiFreshness = getFreshnessMeta(predictionSnapshot?.timestamp ?? null);
  const isCompact = viewMode === 'compact';

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const healthColor = useMemo(() => {
    if (healthScore >= 80) return '#22c55e';
    if (healthScore >= 50) return '#eab308';
    return '#f97373';
  }, [healthScore]);

  if (!selectedVm) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
          <h2 className="text-base font-semibold text-slate-50">No VM Selected</h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose a virtual machine from the left sidebar to inspect its live metrics and health status.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {isError && errorMessage ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-100">
          <div>
            <p className="font-medium">VM unreachable via backend API.</p>
            <p className="mt-0.5 text-[11px] text-rose-200/80">{errorMessage}</p>
          </div>
          {isMockMode ? (
            <span className="rounded-full bg-slate-950/60 px-3 py-1 text-[10px] font-medium text-slate-200">
              Mock metrics enabled
            </span>
          ) : null}
        </div>
      ) : null}

      {isMockMode && !isError ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-[11px] text-amber-100">
          Backend is not reachable. Displaying simulated metrics so that the dashboard remains interactive for demo
          and testing purposes.
        </div>
      ) : null}

      <section className="glass-panel neon-cyan rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-300">Observability Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-50">{selectedVm.name}</h2>
            <p className="mt-1 text-sm text-slate-400">Live telemetry via SysMonX backend · {selectedVm.ip}</p>
          </div>

          <div className="flex flex-wrap items-start justify-end gap-3">
            <div className="inline-flex rounded-xl border border-cyan-500/30 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  isCompact
                    ? 'bg-cyan-500/20 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.2)]'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setViewMode('expanded')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  !isCompact
                    ? 'bg-cyan-500/20 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.2)]'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                Expanded
              </button>
            </div>
            <StatusBadge status={status} />
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-right text-[11px] text-slate-400">
              <p>Real-time sample</p>
              <p className="mt-0.5 text-xs font-medium text-slate-200">{lastSampleText}</p>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ${realtimeFreshness.className}`}>
                {realtimeFreshness.label}
              </p>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-right text-[11px] text-slate-400">
              <p>AI snapshot</p>
              <p className="mt-0.5 text-xs font-medium text-slate-200">{predictionSampleText}</p>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ${aiFreshness.className}`}>
                {aiFreshness.label}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-4 grid gap-3 ${isCompact ? 'md:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
          <article className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">CPU (Real-time)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">{formatPercent(metrics?.cpuUsage ?? null)}</p>
          </article>

          <article className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Memory (Used/Total)</p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              {metrics ? `${formatGiB(metrics.memory.used)} / ${formatGiB(metrics.memory.total)}` : 'Awaiting data'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{formatPercent(memoryPercent)}</p>
          </article>

          <article className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Disk (Used/Total)</p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              {metrics ? `${formatGiB(metrics.disk.used)} / ${formatGiB(metrics.disk.total)}` : 'Awaiting data'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{formatPercent(diskPercent)}</p>
          </article>

          <article className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Health Score</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">{Math.round(healthScore)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{isCompact ? 'Overall health' : 'Composite load confidence indicator'}</p>
          </article>
        </div>
      </section>

      <section className="glass-panel neon-violet rounded-2xl p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-50">Real-time vs AI Predicted</h3>
            <p className="text-xs text-slate-400">
              {isCompact
                ? 'Condensed prediction summary for quick monitoring.'
                : 'Side-by-side comparison for immediate operational decision making.'}
            </p>
          </div>
          <p className="text-[11px] text-slate-400">
            Forecast horizon: next engine cycle
          </p>
        </div>

        {isPredictionError ? (
          <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {predictionMessage ?? 'Unable to fetch AI predictions.'}
          </div>
        ) : null}

        {isPredictionWarmingUp ? (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
            {predictionMessage ?? 'Prediction engine warming up...'}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          {predictionCards.map(({ key, label }) => {
            const prediction = predictionSnapshot?.predictions[key];
            const realtimeValue = realtimeByMetric[key];
            const aiCurrentValue = prediction?.currentValue ?? null;
            const aiPredictedValue = prediction?.predictedValue ?? null;
            const trendColor =
              prediction?.trend === 'increasing'
                ? 'text-amber-300'
                : prediction?.trend === 'decreasing'
                ? 'text-sky-300'
                : 'text-slate-300';
            const delta = formatDelta(realtimeValue, aiPredictedValue);
            const deltaClass =
              delta.startsWith('+')
                ? 'text-amber-300'
                : delta.startsWith('-')
                ? 'text-sky-300'
                : 'text-slate-300';

            return (
              <article key={key} className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-100">{label}</h4>
                  <span className={`text-[11px] font-medium uppercase tracking-wide ${trendColor}`}>
                    {prediction?.trend ?? 'n/a'}
                  </span>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Real-time</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{formatPercent(realtimeValue)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">AI Predicted</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{formatPercent(aiPredictedValue)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5">
                    <span className="text-[11px] text-slate-400">Predicted Delta</span>
                    <span className={`text-[11px] font-semibold ${deltaClass}`}>{delta}</span>
                  </div>

                  {!isCompact ? (
                    <>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">AI Current</span>
                        <span className="text-slate-200">{formatPercent(aiCurrentValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Confidence</span>
                        <span className="text-slate-200">
                          {prediction ? `${Math.round(prediction.confidence * 100)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Anomaly</span>
                        <span className={prediction?.isAnomaly ? 'text-rose-300' : 'text-emerald-300'}>
                          {prediction?.isAnomaly ? 'Detected' : 'Normal'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Confidence</span>
                      <span className="text-slate-200">{prediction ? `${Math.round(prediction.confidence * 100)}%` : 'N/A'}</span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {isPredictionLoading && !predictionSnapshot ? (
          <div className="mt-3 text-xs text-slate-400">Loading AI prediction stream...</div>
        ) : null}
      </section>

      {isLoading && !metrics ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="glass-panel neon-cyan rounded-2xl p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">CPU Usage</h3>
            <p className="text-xs text-slate-400">Last {history.length} samples</p>
          </div>
          <CpuChart data={history} />
        </section>

        <section className="glass-panel neon-cyan rounded-2xl p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">Memory Utilization</h3>
            <p className="text-xs text-slate-400">
              {metrics
                ? `${formatGiB(metrics.memory.used)} / ${formatGiB(metrics.memory.total)}`
                : 'Awaiting data'}
            </p>
          </div>
          <MemoryChart memory={metrics?.memory ?? null} />
        </section>

        <section className="glass-panel neon-cyan rounded-2xl p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">Disk Usage</h3>
            <p className="text-xs text-slate-400">
              {metrics
                ? `${formatGiB(metrics.disk.used)} / ${formatGiB(metrics.disk.total)}`
                : 'Awaiting data'}
            </p>
          </div>
          <DiskChart disk={metrics?.disk ?? null} />
        </section>

        {!isCompact ? (
          <section className="glass-panel neon-violet rounded-2xl p-4 shadow-card md:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-50">Network Traffic</h3>
              <p className="text-xs text-slate-400">Cumulative RX/TX bytes over recent polls</p>
            </div>
            <NetworkChart data={history} />
          </section>
        ) : null}

        {!isCompact ? (
          <section className="glass-panel neon-violet rounded-2xl p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-50">Health Score</h3>
              <p className="text-xs text-slate-400">0 = saturated · 100 = healthy</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-32 w-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={[{ name: 'health', value: healthScore }]}
                    innerRadius="70%"
                    outerRadius="100%"
                    startAngle={220}
                    endAngle={-40}
                  >
                    <RadialBar dataKey="value" cornerRadius={50} fill={healthColor} background />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#0f172a' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-3xl font-semibold text-slate-50">{Math.round(healthScore)}</p>
                <p className="text-xs text-slate-400">Composite score combining CPU, memory, and disk load.</p>
                {isMockMode ? (
                  <p className="text-[11px] text-amber-300">Health score is simulated while backend is offline.</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};
