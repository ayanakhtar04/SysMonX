interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
  const sizes: Record<Required<SpinnerProps>['size'], string> = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-4',
  };

  return (
    <span
      className={`inline-block animate-spin rounded-full border-brand-500 border-t-transparent ${sizes[size]}`}
      aria-label="Loading"
    />
  );
};
