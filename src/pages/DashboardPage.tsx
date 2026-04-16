import { useMemo } from 'react';
import { useVmContext } from '../context/VmContext';
import { useMetrics } from '../hooks/useMetrics';
import { CpuChart } from '../components/charts/CpuChart';
import { MemoryChart } from '../components/charts/MemoryChart';
import { DiskChart } from '../components/charts/DiskChart';
import { NetworkChart } from '../components/charts/NetworkChart';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Spinner } from '../components/ui/Spinner';
import { RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { selectedVm } = useVmContext();
  const { metrics, status, history, isLoading, isError, isMockMode, errorMessage } = useMetrics(
    selectedVm?.id ?? null,
  );

  const healthScore = metrics?.healthScore ?? 0;

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
    <div className="space-y-4">
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{selectedVm.name}</h2>
          <p className="text-xs text-slate-400">Monitored via SysMonX backend at {selectedVm.ip}</p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={status} />
          <div className="text-right text-[11px] text-slate-400">
            <p>Last sample:</p>
            <p className="mt-0.5 text-xs text-slate-200">
              {metrics ? new Date(metrics.timestamp).toLocaleTimeString() : 'Awaiting metrics...'}
            </p>
          </div>
        </div>
      </div>

      {isLoading && !metrics ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">CPU Usage</h3>
            <p className="text-xs text-slate-400">Real-time over last {history.length} samples</p>
          </div>
          <CpuChart data={history} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">Memory Utilization</h3>
            <p className="text-xs text-slate-400">
              {metrics
                ? `${Math.round(metrics.memory.used / 1024)} / ${Math.round(metrics.memory.total / 1024)} GiB`
                : 'Awaiting data'}
            </p>
          </div>
          <MemoryChart memory={metrics?.memory ?? null} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">Disk Usage</h3>
            <p className="text-xs text-slate-400">
              {metrics
                ? `${Math.round(metrics.disk.used / 1024)} / ${Math.round(metrics.disk.total / 1024)} GiB`
                : 'Awaiting data'}
            </p>
          </div>
          <DiskChart disk={metrics?.disk ?? null} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-50">Network Traffic</h3>
            <p className="text-xs text-slate-400">Cumulative RX/TX bytes over polling window</p>
          </div>
          <NetworkChart data={history} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-card">
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
      </div>
    </div>
  );
};
