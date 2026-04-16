import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DiskMetrics } from '../../types/metrics';

interface DiskChartProps {
  disk: DiskMetrics | null;
}

const COLORS = ['#38bdf8', '#0f172a'];

export const DiskChart: React.FC<DiskChartProps> = ({ disk }) => {
  const used = disk?.used ?? 0;
  const total = disk?.total ?? 0;
  const free = Math.max(total - used, 0);

  const data = [
    { name: 'Used', value: used },
    { name: 'Free', value: free },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#0f172a' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
