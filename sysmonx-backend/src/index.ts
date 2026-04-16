import dotenv from 'dotenv';
import { createServer } from './server';
import { engineOrchestrator } from './modules/engine/orchestrator';

dotenv.config();

const app = createServer();

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(port, () => {
  // In production, use proper logger instead of console
  // For this FYP backend, a concise startup log is acceptable.
  // eslint-disable-next-line no-console
  console.log(`SysMonX backend listening on port ${port}`);
  
  // Start the Smart Self-Healing & Intelligence Engine
  engineOrchestrator.start(5000);
});
