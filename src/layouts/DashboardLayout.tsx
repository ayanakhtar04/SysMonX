import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVmContext } from '../context/VmContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { isValidIp } from '../utils/ipValidator';

export const DashboardLayout: React.FC = () => {
  const { userEmail, logout } = useAuth();
  const { vmList, selectedVm, isLoading, error, selectVm, addVm } = useVmContext();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [vmName, setVmName] = useState<string>('');
  const [vmIp, setVmIp] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAddVm = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    if (!vmName.trim()) {
      setFormError('VM name is required.');
      return;
    }
    if (!isValidIp(vmIp)) {
      setFormError('Please provide a valid IPv4 address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addVm({ name: vmName.trim(), ip: vmIp.trim() });
      setIsModalOpen(false);
      setVmName('');
      setVmIp('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-72 flex-col border-r border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-slate-950 shadow-card">
            <span className="text-lg font-black">SX</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-50">SysMonX</h1>
            <p className="text-xs text-slate-500">Secure VM Monitoring</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Virtual Machines
            </span>
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => setIsModalOpen(true)}
            >
              + Add
            </Button>
          </div>

          {isLoading && vmList.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : null}

          {error ? (
            <p className="mb-2 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          ) : null}

          <ul className="space-y-1">
            {vmList.map((vm) => {
              const isActive = selectedVm?.id === vm.id;
              return (
                <li key={vm.id}>
                  <button
                    type="button"
                    onClick={() => selectVm(vm.id)}
                    className={`flex w-full flex-col items-start rounded-xl border px-3 py-2 text-left text-xs transition hover:border-brand-500 hover:bg-slate-900/80 ${
                      isActive
                        ? 'border-brand-500 bg-slate-900/80 shadow-card shadow-brand-900/30'
                        : 'border-slate-800 bg-slate-900/40'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-50">{vm.name}</span>
                    <span className="mt-0.5 text-[11px] text-slate-400">{vm.ip}</span>
                    <span className="mt-0.5 text-[10px] text-slate-500">
                      Added {new Date(vm.createdAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              );
            })}

            {vmList.length === 0 && !isLoading ? (
              <li className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
                No VMs registered yet. Use the <span className="font-semibold text-slate-200">Add</span> button to
                register your first VM via the backend API.
              </li>
            ) : null}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-8 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-50">Remote VM Monitoring</h2>
            <p className="text-xs text-slate-500">
              Observability for Node Exporter powered infrastructure through the SysMonX backend.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end text-xs">
              <span className="font-medium text-slate-100">{userEmail}</span>
              <span className="text-[11px] text-slate-500">Project Owner</span>
            </div>
            <Button type="button" variant="ghost" className="text-xs" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950/90 px-8 py-6">
          <Outlet />
        </main>
      </div>

      <Modal
        isOpen={isModalOpen}
        title="Register Virtual Machine"
        description="Register a VM address that the SysMonX backend will monitor through Node Exporter."
        onClose={() => {
          if (!isSubmitting) {
            setIsModalOpen(false);
          }
        }}
      >
        <form onSubmit={handleAddVm} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="vm-name" className="text-xs font-medium text-slate-200">
              VM Name
            </label>
            <input
              id="vm-name"
              type="text"
              value={vmName}
              onChange={(event) => setVmName(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-brand-500/40 placeholder:text-slate-500 focus:border-brand-500 focus:ring-2"
              placeholder="Production API Server"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="vm-ip" className="text-xs font-medium text-slate-200">
              VM IP Address
            </label>
            <input
              id="vm-ip"
              type="text"
              value={vmIp}
              onChange={(event) => setVmIp(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-brand-500/40 placeholder:text-slate-500 focus:border-brand-500 focus:ring-2"
              placeholder="192.168.1.10"
            />
          </div>

          {formError ? (
            <p className="text-xs text-rose-300">{formError}</p>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (!isSubmitting) {
                  setIsModalOpen(false);
                }
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-xs">Registering...</span>
                </span>
              ) : (
                'Register VM'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
