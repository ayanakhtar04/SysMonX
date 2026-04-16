import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricsHistoryPoint } from '../../types/metrics';

interface NetworkChartProps {
  data: MetricsHistoryPoint[];
}

export const NetworkChart: React.FC<NetworkChartProps> = ({ data }) => (
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
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#020617', borderColor: '#0f172a' }}
          labelFormatter={(value: string) => new Date(value).toLocaleTimeString()}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
        <Line
          type="monotone"
          dataKey="rx"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="RX"
        />
        <Line
          type="monotone"
          dataKey="tx"
          stroke="#f97316"
          strokeWidth={2}
          dot={false}
          name="TX"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
