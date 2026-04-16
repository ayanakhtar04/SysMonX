import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { MetricsHistoryPoint } from '../../types/metrics';

interface CpuChartProps {
  data: MetricsHistoryPoint[];
}

export const CpuChart: React.FC<CpuChartProps> = ({ data }) => (
  <div className="h-56 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="timestamp"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickFormatter={(value: string) => new Date(value).toLocaleTimeString()}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          domain={[0, 100]}
          unit="%"
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#020617', borderColor: '#0f172a' }}
          labelFormatter={(value: string) => new Date(value).toLocaleTimeString()}
        />
        <Line
          type="monotone"
          dataKey="cpuUsage"
          stroke="#0ea5e9"
          strokeWidth={2}
          dot={false}
          name="CPU Usage"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
