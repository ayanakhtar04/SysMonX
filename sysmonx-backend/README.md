# SysMonX Backend – VM Metrics Gateway

This is the backend service for **SysMonX – Secure Web-Based Remote VM Monitoring Platform**. It acts as a secure intermediary between the React frontend and remote VMs running **Node Exporter**.

The backend is responsible for:

- Managing a registry of monitored VMs (in memory).
- Fetching Prometheus metrics from Node Exporter on each VM.
- Parsing raw metrics and computing a normalized health score.
- Exposing a clean REST API used by the SysMonX frontend.

The frontend never calls VM IPs directly; all traffic goes through this service.

## Tech Stack

- Node.js
- TypeScript (strict)
- Express
- Axios (HTTP client)
- UUID (VM identifiers)
- CORS enabled
- dotenv for configuration

## Project Structure

```text
sysmonx-backend/
  src/
    index.ts          # Entry point (loads env, starts server)
    server.ts         # Express app factory, CORS, routes, error handling
    routes/
      vm.routes.ts    # /api/vms routes
    controllers/
      vm.controller.ts# HTTP handlers delegating to services
    services/
      vm.service.ts   # In-memory VM registry
      metrics.service.ts # Fetch + parse Node Exporter metrics, compute responses
    utils/
      metricsParser.ts   # Prometheus text parser for Node Exporter metrics
      healthCalculator.ts# Health score + status computation
      ipValidator.ts     # IPv4 validation
    types/
      vm.types.ts        # VM domain types
      metrics.types.ts   # Parsed metrics + API response types
  package.json
  tsconfig.json
  .env.example
  README.md
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
PORT=5000
NODE_ENV=development
NODE_EXPORTER_PORT=9100
```

- `PORT`: HTTP port for the backend API.
- `NODE_EXPORTER_PORT`: Port where Node Exporter is listening on each VM.

## Installation & Running

From the `sysmonx-backend` directory:

```powershell
cd f:\SysMonX\sysmonx-backend
npm install
```

### Development mode

```powershell
npm run dev
```

This runs the server with `ts-node-dev` and automatically reloads on changes.

### Production build & run

```powershell
npm run build
npm start
```

## API Overview

Base URL: `http://localhost:PORT`

### POST /api/vms

Register a VM to be monitored.

Request body:

```json
{
  "name": "Production API Server",
  "ip": "192.168.1.10"
}
```

Response `201`:

```json
{
  "id": "<uuid>",
  "name": "Production API Server",
  "ip": "192.168.1.10",
  "createdAt": "2026-02-18T10:00:00.000Z"
}
```

Validation:

- IPv4 is validated server-side using a regex.
- Invalid input returns `400` with a structured error body.

### GET /api/vms

Returns the list of all registered VMs (in-memory storage).

### GET /api/vms/:id/metrics

Fetches live metrics from the VM referenced by `id` by calling:

```text
http://<VM-IP>:NODE_EXPORTER_PORT/metrics
```

Node Exporter must be running and accessible from the backend.

Response shape matches the frontend contract:

```json
{
  "cpuUsage": 37.2,
  "memory": { "used": 8378124288, "total": 17179869184 },
  "disk": { "used": 150000000000, "total": 256000000000 },
  "network": { "rx": 123456789, "tx": 987654321 },
  "healthScore": 86.4,
  "timestamp": "2026-02-18T10:05:00.000Z"
}
```

Error responses:

- `404` if VM ID is unknown.
- `502` if Node Exporter is unreachable or metrics cannot be parsed.

### GET /api/vms/:id/status

Returns a simple health status derived from the same health score logic:

```json
{
  "status": "healthy" | "warning" | "critical"
}
```

## Metrics Parsing & Health Calculation

- `metricsParser.ts` parses Prometheus text and extracts:
  - CPU: `node_cpu_seconds_total` (idle vs total)
  - Memory: `node_memory_MemTotal_bytes`, `node_memory_MemAvailable_bytes`
  - Disk: `node_filesystem_size_bytes`, `node_filesystem_avail_bytes` (root mount preferred)
  - Network: `node_network_receive_bytes_total`, `node_network_transmit_bytes_total`

- `healthCalculator.ts` uses a weighted utilization formula:

  - CPU: 40%
  - Memory: 30%
  - Disk: 20%
  - Network: 10%

  Health score is defined as:

  - `healthScore = 100 - weightedUtilization`
  - Clamped to `[0, 100]`.

  Status mapping:

  - `80–100` → `healthy`
  - `50–79` → `warning`
  - `<50` → `critical`

## Design Notes

- All business logic lives in services and utilities; routes/controllers are thin.
- VM storage is in-memory for simplicity; this can be replaced with a database without changing controllers.
- Error responses are structured JSON objects with `error` and optional `details` fields.
- CORS is enabled so the SysMonX React frontend can call this API directly from the browser.
