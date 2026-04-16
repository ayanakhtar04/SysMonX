/**
 * Engine Integration Guide
 * 
 * This file demonstrates how to integrate predictions into the orchestrator loop.
 * 
 * INTEGRATION STEPS:
 * 
 * 1. In orchestrator.ts, add imports:
 *    import { predictionService } from '../prediction/predictionService';
 *    import { engineStateStore, type EngineState } from './engineState';
 * 
 * 2. In the orchestrationTick() method, after collecting metrics:
 *    - Get the metric history arrays (cpu, memory, disk)
 *    - Call: const snapshot = await predictionService.runPredictions(metricBuffers);
 *    - Call: engineStateStore.setLatestPredictionSnapshot(snapshot);
 *    - Use snapshot.alerts to trigger additional actions if needed
 *    - Pass engineStateStore helpers to rule conditions: willBreachSoon(), isAnomalous()
 * 
 * 3. In the rule evaluation step:
 *    - Rules can now access prediction data via engineStateStore
 *    - Example condition:
 *      condition: () => engineStateStore.willBreachSoon() && engineStateStore.isAnomalous()
 * 
 * EXAMPLE INTEGRATION IN orchestrationTick():
 * 
 *   private async orchestrationTick() {
 *     await this.metricsCollector.collect();
 *     
 *     const history = this.metricsCollector.getHistory();
 *     const reversed = [...history].reverse();
 *     
 *     const metricBuffers = {
 *       cpu: reversed.map(m => m.cpu),
 *       memory: reversed.map(m => m.memory),
 *       disk: reversed.map(m => m.disk)
 *     };
 *     
 *     // Run prediction engine
 *     const predictionSnapshot = await predictionService.runPredictions(metricBuffers);
 *     engineStateStore.setLatestPredictionSnapshot(predictionSnapshot);
 *     
 *     // Alert on prediction alerts
 *     for (const alert of predictionSnapshot.alerts) {
 *       this.addAlert(alert.message, alert.severity === 'critical' ? 'critical' : 'warning');
 *     }
 *     
 *     // Existing rule evaluation
 *     await this.ruleEngine.evaluate({
 *       cpu: reversed.map(m => m.cpu),
 *       memory: reversed.map(m => m.memory),
 *       disk: reversed.map(m => m.disk),
 *     });
 *   }
 */

export const INTEGRATION_NOTES = {
  description: 'Integration guide for prediction engine into orchestrator',
  steps: [
    'Import predictionService and engineStateStore',
    'Call predictionService.runPredictions(metricBuffers) in orchestrationTick',
    'Store result with engineStateStore.setLatestPredictionSnapshot(snapshot)',
    'Use helpers: willBreachSoon(), isAnomalous(), getBreachers(), getAnomalies()',
    'Reference in rule conditions for intelligent decision-making'
  ]
};
