export type PredictionMetric = 'cpu' | 'memory' | 'disk';

export interface PredictionResult {
  metric: PredictionMetric;
  currentValue: number;
  predictedValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  isAnomaly: boolean;
  anomalyScore: number;
  willBreachThreshold: boolean;
  breachThreshold: number;
  confidence: number;
  timestamp: string;
}

export interface PredictionSnapshot {
  timestamp: string;
  predictions: {
    cpu: PredictionResult;
    memory: PredictionResult;
    disk: PredictionResult;
  };
}

export interface PredictionApiResponse {
  success: boolean;
  data: PredictionSnapshot | null;
  message?: string;
}
