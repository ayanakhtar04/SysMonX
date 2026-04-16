# SysMonX – Secure Web-Based Remote VM Monitoring Platform

SysMonX is a production-ready React + TypeScript dashboard for monitoring remote VMs through a secure backend API. The frontend never connects directly to VM IPs; instead, it talks exclusively to the SysMonX backend REST API, which in turn aggregates metrics from Node Exporter on each VM.

## Tech Stack

- React 18 (Vite)
- TypeScript (strict)
- Tailwind CSS (dark theme)
- React Router v6
- Recharts (all graphs)
- Axios (API layer)
- Context API + custom hooks

## Backend API Contract

The frontend expects the following endpoints to be available on `VITE_API_BASE_URL`:

- `POST /api/vms`
- `GET /api/vms`
- `GET /api/vms/:id/metrics`
- `GET /api/vms/:id/status`

See `src/services/vmService.ts` for the exact payload and response types.

## Getting Started

### 1. Install dependencies

```powershell
cd f:\SysMonX
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` if needed and adjust the backend base URL:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

Point this to your SysMonX backend instance.

### 3. Run in development mode

```powershell
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

### 4. Production build

```powershell
npm run build
```

To preview the built app locally:

```powershell
npm run preview
```

## Application Flow

1. **Login** – Static login form (`src/pages/LoginPage.tsx`). On submit, the email is stored in `AuthContext` and the user is redirected to the dashboard.
2. **VM Management** – The sidebar lists VMs loaded from the backend via `VmContext` (`src/context/VmContext.tsx`). The **Add VM** modal validates IPv4 addresses and calls `POST /api/vms`.
3. **Monitoring Dashboard** – For the selected VM, `useMetrics` (`src/hooks/useMetrics.ts`) polls the backend every 5 seconds for metrics and status, maintaining a rolling history for charts.
4. **Mock Mode** – If the backend is unavailable, `useMetrics` automatically switches to a realistic mock metrics generator so the dashboard remains interactive.

## Key Source Files

- Entry & routing
  - `src/main.tsx` – React entrypoint
  - `src/App.tsx` – Providers + router
  - `src/router.tsx` – React Router v6 routes with protected dashboard

- Contexts
  - `src/context/AuthContext.tsx` – Authentication state (email + login/logout)
  - `src/context/VmContext.tsx` – VM list, selection, add VM, refresh

- Hooks
  - `src/hooks/usePolling.ts` – Generic polling hook
  - `src/hooks/useMetrics.ts` – Metrics polling, history, mock fallback, status

- Services & types
  - `src/services/api.ts` – Axios instance
  - `src/services/vmService.ts` – Wrapper around backend VM endpoints
  - `src/types/vm.ts`, `src/types/metrics.ts`, `src/types/status.ts` – Strongly typed models

- Layout & pages
  - `src/layouts/DashboardLayout.tsx` – Sidebar, navbar, add-VM modal, main outlet
  - `src/pages/LoginPage.tsx` – Login screen
  - `src/pages/DashboardPage.tsx` – VM metrics dashboard

- Components
  - `src/components/charts/*` – CPU, memory, disk, network charts (Recharts)
  - `src/components/ui/*` – Button, Modal, StatusBadge, Spinner

## Notes

- The frontend never calls VM IPs directly; all data flows through the backend API defined by `VITE_API_BASE_URL`.
- TypeScript `strict` mode is enabled and no `any` types are used in the application code.
-- Tailwind provides a dark, responsive SaaS-style UI with card-based layout and subtle shadows.

## VM Requirements & End-to-End Testing Guide

This section describes exactly what must be running on a remote VM and which steps to follow so that the SysMonX web UI can monitor it by IP.

### 1. Prepare the VM (Ubuntu example)

On the target VM (e.g., Ubuntu 22.04/24.04):

1. Make sure the VM has network connectivity to the SysMonX backend machine (ping from both sides).
2. Install and run **Node Exporter** (Prometheus):

  ```bash
  # Example: download and run Node Exporter (adjust version as needed)
  wget https://github.com/prometheus/node_exporter/releases/download/v1.8.2/node_exporter-1.8.2.linux-amd64.tar.gz
  tar xzf node_exporter-1.8.2.linux-amd64.tar.gz
  cd node_exporter-1.8.2.linux-amd64
  ./node_exporter --web.listen-address=":9100"
  ```

  For production, you would typically run this as a systemd service; for the FYP demonstration, a foreground process is sufficient as long as it stays running.

3. Confirm Node Exporter is serving Prometheus metrics on the VM:

  ```bash
  curl http://localhost:9100/metrics | head
  ```

  You should see Prometheus-style text output starting with `# HELP` / `# TYPE` lines.

### 2. Open firewall on the VM (if ufw is enabled)

Still on the VM:

```bash
sudo ufw status
```

If `Status: active`, allow Node Exporter’s port:

```bash
sudo ufw allow 9100/tcp
sudo ufw status
```

You should see a rule allowing port 9100.

### 3. Test connectivity from the SysMonX backend machine

On the machine where the backend runs (Windows in this project):

```powershell
curl http://<VM-IP>:9100/metrics
```

Replace `<VM-IP>` with the VM address, for example:

```powershell
curl http://192.168.174.129:9100/metrics
```

If you see the same Prometheus metrics text, the network path and firewall are correctly configured.

### 4. Start SysMonX backend

On Windows, from the backend folder:

```powershell
cd F:\SysMonX\sysmonx-backend
Copy-Item .env.example .env -ErrorAction SilentlyContinue
npm install
npm run dev
```

The backend listens on `http://localhost:5000` by default. Quick health check:

```powershell
curl http://localhost:5000/health
```

Response should be:

```json
{ "status": "ok" }
```

### 5. Start SysMonX frontend

In another terminal:

```powershell
cd F:\SysMonX
npm install
npm run dev
```

Then open the printed URL, typically:

```text
http://localhost:5173
```

### 6. Log in to the web UI

The login page is intentionally simple and does not talk to the backend:

- Enter any non-empty **email** and **password**.
- Click **"Continue to Dashboard"**.

You will be redirected to the main SysMonX dashboard.

### 7. Register the VM in SysMonX

1. In the left sidebar, click **"Add"**.
2. Fill in:

  - **Name**: a descriptive label, e.g. `Ubuntu25-Test`.
  - **IP**: the VM IP, e.g. `192.168.174.129`.

3. Click **"Register VM"**.

The frontend calls `POST /api/vms` on the backend, which validates the IPv4 address and stores the VM in memory. The VM should now appear in the sidebar and automatically be selected.

### 8. Observe live metrics in the dashboard

With the VM selected in the sidebar, the frontend will poll every 5 seconds:

- `GET /api/vms/:id/metrics`
- `GET /api/vms/:id/status`

If Node Exporter and the backend are both reachable:

- **CPU chart** shows real usage over time.
- **Memory card** shows used vs total memory based on `node_memory_MemTotal_bytes` and `node_memory_MemAvailable_bytes`.
- **Disk card** shows used vs total disk for the root filesystem `/` using `node_filesystem_size_bytes` and `node_filesystem_avail_bytes`.
- **Network chart** shows RX/TX bytes from `node_network_receive_bytes_total` and `node_network_transmit_bytes_total`.
- **Health score gauge** reflects the weighted utilization (CPU 40%, Memory 30%, Disk 20%, Network 10%).
- **Status badge** reports `healthy`, `warning`, or `critical` based on the health score.

If the backend cannot reach Node Exporter (network or service issue), the frontend will:

- Show a **"VM unreachable via backend API"** banner.
- Enable **mock metrics mode**, simulating realistic values so the UI remains interactive for demo purposes.
