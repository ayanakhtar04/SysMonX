import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className,
  children,
  ...rest
}) => {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60';

  const variants: Record<Required<ButtonProps>['variant'], string> = {
    primary:
      'bg-brand-500 text-white hover:bg-brand-600 shadow-card shadow-brand-900/40',
    secondary:
      'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/60',
  };

  const classes = `${base} ${variants[variant]} ${className ?? ''}`;

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};
