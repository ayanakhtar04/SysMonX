import type { VmStatus } from '../../types/status';

interface StatusBadgeProps {
  status: VmStatus | null;
}

const getLabel = (status: VmStatus | null): string => {
  if (!status) return 'Unknown';
  if (status === 'healthy') return 'Healthy';
  if (status === 'warning') return 'Warning';
  return 'Critical';
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let classes = 'bg-slate-700 text-slate-100 border border-slate-500';

  if (status === 'healthy') {
    classes = 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/60';
  } else if (status === 'warning') {
    classes = 'bg-amber-500/10 text-amber-300 border border-amber-500/60';
  } else if (status === 'critical') {
    classes = 'bg-rose-500/10 text-rose-300 border border-rose-500/60';
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${classes}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {getLabel(status)}
    </span>
  );
};
