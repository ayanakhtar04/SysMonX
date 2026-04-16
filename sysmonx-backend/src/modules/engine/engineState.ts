/**
 * Engine State
 * Shared state store for latest prediction snapshot and helpers
 */

import { PredictionSnapshot } from '../prediction/predictionService';

export interface EngineState {
  latestPredictionSnapshot: PredictionSnapshot | null;
  lastStateUpdateTime: string;
}

class EngineStateStore {
  private state: EngineState = {
    latestPredictionSnapshot: null,
    lastStateUpdateTime: new Date().toISOString()
  };

  public setLatestPredictionSnapshot(snapshot: PredictionSnapshot): void {
    this.state.latestPredictionSnapshot = snapshot;
    this.state.lastStateUpdateTime = new Date().toISOString();
  }

  public getLatestPredictionSnapshot(): PredictionSnapshot | null {
    return this.state.latestPredictionSnapshot;
  }

  public getEngineState(): EngineState {
    return this.state;
  }

  /**
   * Helper: Check if any metric will breach soon
   */
  public willBreachSoon(): boolean {
    if (!this.state.latestPredictionSnapshot) return false;
    const { willBreachSoon } = this.state.latestPredictionSnapshot;
    return willBreachSoon.cpu || willBreachSoon.memory || willBreachSoon.disk;
  }

  /**
   * Helper: Check if any metric is anomalous
   */
  public isAnomalous(): boolean {
    if (!this.state.latestPredictionSnapshot) return false;
    const { isAnomalous } = this.state.latestPredictionSnapshot;
    return isAnomalous.cpu || isAnomalous.memory || isAnomalous.disk;
  }

  /**
   * Helper: Get breach information per metric
   */
  public getBreachers(): string[] {
    if (!this.state.latestPredictionSnapshot) return [];
    const { willBreachSoon } = this.state.latestPredictionSnapshot;
    const breaching: string[] = [];
    if (willBreachSoon.cpu) breaching.push('cpu');
    if (willBreachSoon.memory) breaching.push('memory');
    if (willBreachSoon.disk) breaching.push('disk');
    return breaching;
  }

  /**
   * Helper: Get anomalous metrics
   */
  public getAnomalies(): string[] {
    if (!this.state.latestPredictionSnapshot) return [];
    const { isAnomalous } = this.state.latestPredictionSnapshot;
    const anomalies: string[] = [];
    if (isAnomalous.cpu) anomalies.push('cpu');
    if (isAnomalous.memory) anomalies.push('memory');
    if (isAnomalous.disk) anomalies.push('disk');
    return anomalies;
  }
}

// Export singleton
export const engineStateStore = new EngineStateStore();
