import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required to continue.');
      return;
    }

    login(email.trim());
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-slate-950 shadow-card">
            <span className="text-xl font-black">SX</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-50">SysMonX Console</h1>
            <p className="text-xs text-slate-500">Sign in to access your remote VM monitoring workspace.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-slate-200">
              Work Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-brand-500/40 placeholder:text-slate-500 focus:border-brand-500 focus:ring-2"
              placeholder="you@engineering-campus.edu"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-slate-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-brand-500/40 placeholder:text-slate-500 focus:border-brand-500 focus:ring-2"
              placeholder="Enter a secure password"
            />
          </div>

          {error ? <p className="text-xs text-rose-300">{error}</p> : null}

          <Button type="submit" className="mt-2 w-full justify-center">
            Continue to Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};
