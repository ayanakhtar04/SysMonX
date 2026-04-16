import { Router } from 'express';
import { engineStateStore } from '../modules/engine/engineState';
import { predictionService } from '../modules/prediction/predictionService';

const router = Router();

/**
 * GET /predictions
 * Returns the latest prediction snapshot for all metrics
 */
router.get('/', (_req, res) => {
  const snapshot = engineStateStore.getLatestPredictionSnapshot();
  if (!snapshot) {
    return res.status(202).json({
      success: true,
      message: 'Predictions not yet available (engine warming up)',
      data: null
    });
  }

  res.json({
    success: true,
    data: snapshot
  });
});

/**
 * GET /predictions/alerts
 * Returns all prediction alerts from history
 */
router.get('/alerts', (_req, res) => {
  const alerts = predictionService.getAlertHistory();
  res.json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});

/**
 * GET /predictions/:metric
 * Returns detailed prediction for a specific metric (cpu, memory, or disk)
 */
router.get('/:metric', (req, res) => {
  const { metric } = req.params as { metric: string };
  const validMetrics = ['cpu', 'memory', 'disk'];

  if (!validMetrics.includes(metric)) {
    return res.status(400).json({
      success: false,
      error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
    });
  }

  const snapshot = engineStateStore.getLatestPredictionSnapshot();
  if (!snapshot) {
    return res.status(202).json({
      success: true,
      message: 'Predictions not yet available (engine warming up)',
      data: null
    });
  }

  const metricKey = metric as 'cpu' | 'memory' | 'disk';
  const prediction = snapshot.predictions[metricKey];
  const alerts = predictionService.getAlertsByMetric(metricKey);

  res.json({
    success: true,
    data: {
      prediction,
      recentAlerts: alerts.slice(0, 10)
    }
  });
});

export default router;
