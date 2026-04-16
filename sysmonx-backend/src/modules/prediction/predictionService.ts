/**
 * Prediction Service
 * Orchestrates prediction runs, manages alerts, and handles cooldowns
 */

import { PredictionEngine, PredictionResult } from './predictionEngine';

export interface PredictionAlert {
  id: string;
  timestamp: string;
  metric: 'cpu' | 'memory' | 'disk';
  type: 'anomaly' | 'breach_warning' | 'trend_warning';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  data: {
    current: number;
    predicted: number;
    threshold?: number;
    anomalyScore?: number;
  };
}

export interface PredictionSnapshot {
  timestamp: string;
  predictions: {
    cpu: PredictionResult;
    memory: PredictionResult;
    disk: PredictionResult;
  };
  alerts: PredictionAlert[];
  willBreachSoon: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
  };
  isAnomalous: {
    cpu: boolean;
    memory: boolean;
    disk: boolean;
  };
}

export class PredictionService {
  private engine: PredictionEngine;
  private alertHistory: PredictionAlert[] = [];
  private lastAlertTime: { [key: string]: number } = {};
  private alertCooldown = 60000; // 1 minute cooldown between same-type alerts

  private thresholds = {
    cpu: 85,
    memory: 85,
    disk: 90
  };

  constructor() {
    this.engine = new PredictionEngine();
  }

  /**
   * Run predictions for all metrics given the current data buffers
   */
  public async runPredictions(metricBuffers: {
    cpu: number[];
    memory: number[];
    disk: number[];
  }): Promise<PredictionSnapshot> {
    const timestamp = new Date().toISOString();
    const predictions = {
      cpu: this.engine.predict('cpu', metricBuffers.cpu, this.thresholds),
      memory: this.engine.predict('memory', metricBuffers.memory, this.thresholds),
      disk: this.engine.predict('disk', metricBuffers.disk, this.thresholds)
    };

    const alerts: PredictionAlert[] = [];

    // Check each metric for alerts
    for (const [metricKey, result] of Object.entries(predictions)) {
      const metric = metricKey as 'cpu' | 'memory' | 'disk';

      // Anomaly detection alert
      if (result.isAnomaly) {
        const alertKey = `anomaly-${metric}`;
        if (this.canRaiseAlert(alertKey)) {
          const alert: PredictionAlert = {
            id: Math.random().toString(36).substring(7),
            timestamp,
            metric,
            type: 'anomaly',
            message: `Anomaly detected on ${metric}: value ${result.currentValue} is ${result.anomalyScore.toFixed(2)} std devs from normal`,
            severity: 'warning',
            data: {
              current: result.currentValue,
              predicted: result.predictedValue,
              anomalyScore: result.anomalyScore
            }
          };
          alerts.push(alert);
          this.recordAlertTime(alertKey);
        }
      }

      // Breach warning alert
      if (result.willBreachThreshold && result.confidence > 0.6) {
        const alertKey = `breach-${metric}`;
        if (this.canRaiseAlert(alertKey)) {
          const alert: PredictionAlert = {
            id: Math.random().toString(36).substring(7),
            timestamp,
            metric,
            type: 'breach_warning',
            message: `${metric} predicted to exceed ${result.breachThreshold}% threshold (predicted: ${result.predictedValue}%)`,
            severity: result.currentValue > result.breachThreshold ? 'critical' : 'warning',
            data: {
              current: result.currentValue,
              predicted: result.predictedValue,
              threshold: result.breachThreshold
            }
          };
          alerts.push(alert);
          this.recordAlertTime(alertKey);
        }
      }

      // Increasing trend alert (only if not already in breach)
      if (
        result.trend === 'increasing' &&
        result.currentValue < result.breachThreshold * 0.8 &&
        result.predictedValue > result.currentValue * 1.1
      ) {
        const alertKey = `trend-${metric}`;
        if (this.canRaiseAlert(alertKey)) {
          const alert: PredictionAlert = {
            id: Math.random().toString(36).substring(7),
            timestamp,
            metric,
            type: 'trend_warning',
            message: `Increasing trend detected on ${metric}: currently ${result.currentValue}%, trending toward ${result.predictedValue}%`,
            severity: 'info',
            data: {
              current: result.currentValue,
              predicted: result.predictedValue
            }
          };
          alerts.push(alert);
          this.recordAlertTime(alertKey);
        }
      }
    }

    // Store alerts in history
    this.alertHistory.unshift(...alerts);
    if (this.alertHistory.length > 200) {
      this.alertHistory = this.alertHistory.slice(0, 200);
    }

    const snapshot: PredictionSnapshot = {
      timestamp,
      predictions,
      alerts,
      willBreachSoon: {
        cpu: predictions.cpu.willBreachThreshold,
        memory: predictions.memory.willBreachThreshold,
        disk: predictions.disk.willBreachThreshold
      },
      isAnomalous: {
        cpu: predictions.cpu.isAnomaly,
        memory: predictions.memory.isAnomaly,
        disk: predictions.disk.isAnomaly
      }
    };

    return snapshot;
  }

  private canRaiseAlert(alertKey: string): boolean {
    const lastTime = this.lastAlertTime[alertKey] || 0;
    return Date.now() - lastTime >= this.alertCooldown;
  }

  private recordAlertTime(alertKey: string): void {
    this.lastAlertTime[alertKey] = Date.now();
  }

  public getAlertHistory(): PredictionAlert[] {
    return this.alertHistory;
  }

  public getAlertsByMetric(metric: 'cpu' | 'memory' | 'disk'): PredictionAlert[] {
    return this.alertHistory.filter(a => a.metric === metric);
  }

  public clearOldAlerts(olderThanMs: number = 3600000): void {
    const cutoffTime = Date.now() - olderThanMs;
    this.alertHistory = this.alertHistory.filter(
      a => new Date(a.timestamp).getTime() > cutoffTime
    );
  }
}

// Export singleton
export const predictionService = new PredictionService();
