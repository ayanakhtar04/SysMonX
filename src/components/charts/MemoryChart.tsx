import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MemoryMetrics } from '../../types/metrics';

interface MemoryChartProps {
  memory: MemoryMetrics | null;
}

export const MemoryChart: React.FC<MemoryChartProps> = ({ memory }) => {
  const used = memory?.used ?? 0;
  const total = memory?.total ?? 0;
  const free = Math.max(total - used, 0);

  const data = [
    { name: 'Used', value: used },
    { name: 'Free', value: free },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#0f172a' }} />
          <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
