import { Router } from 'express';
import { engineOrchestrator } from '../modules/engine/orchestrator';

const router = Router();

// GET /metrics → current metrics
router.get('/metrics', (_req, res) => {
  const current = engineOrchestrator.getCurrentMetrics();
  res.json({
    success: true,
    data: current
  });
});

// GET /history → last 50 values
router.get('/history', (_req, res) => {
  const history = engineOrchestrator.getMetricsHistory();
  res.json({
    success: true,
    data: history
  });
});

// GET /alerts → recent alerts
router.get('/alerts', (_req, res) => {
  const alerts = engineOrchestrator.getAlerts();
  res.json({
    success: true,
    data: alerts
  });
});

// GET /status → system health summary
router.get('/status', (_req, res) => {
  const status = engineOrchestrator.getStatus();
  res.json({
    success: true,
    data: status
  });
});

// Start/Stop engine manually
router.post('/engine/start', (_req, res) => {
  engineOrchestrator.start();
  res.json({ success: true, message: 'Engine started' });
});

router.post('/engine/stop', (_req, res) => {
  engineOrchestrator.stop();
  res.json({ success: true, message: 'Engine stopped' });
});

export default router;
