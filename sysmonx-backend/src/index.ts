import dotenv from 'dotenv';
import { createServer } from './server';
import { engineOrchestrator } from './modules/engine/orchestrator';

dotenv.config();

const app = createServer();

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

const server = app.listen(port, () => {
  // In production, use proper logger instead of console
  // For this FYP backend, a concise startup log is acceptable.
  // eslint-disable-next-line no-console
  console.log(`SysMonX backend listening on port ${port}`);
  
  // Start the Smart Self-Healing & Intelligence Engine
  engineOrchestrator.start(5000);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    // eslint-disable-next-line no-console
    console.error(`[Startup] Port ${port} is already in use. Stop the existing process or run with a different PORT.`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error('[Startup] Failed to start backend server:', error.message);
  process.exit(1);
});
