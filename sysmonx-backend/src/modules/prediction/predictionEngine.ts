/**
 * SysMonX — AI Prediction Engine
 *
 * Pure statistical approach — no ML libraries, no paid APIs.
 * Implements:
 *   1. Linear Regression (from scratch) → forecast future values
 *   2. Threshold Breach Prediction     → "CPU hits 90% in ~Xs"
 *   3. Anomaly Scoring                 → Z-score based deviation
 */

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

export interface RegressionResult {
  slope: number;        // rate of change per tick
  intercept: number;    // baseline value
  r2: number;           // goodness of fit (0–1)
}

export interface ForecastPoint {
  ticksAhead: number;
  secondsAhead: number; // ticksAhead × COLLECTION_INTERVAL_SEC
  predictedValue: number;
}

export interface AnomalyScore {
  zScore: number;        // standard deviations from mean
  isAnomaly: boolean;    // |zScore| > threshold
  severity: 'normal' | 'warning' | 'critical';
}

export interface ThresholdPrediction {
  willBreach: boolean;
  breachThreshold: number;
  estimatedBreachSeconds: number | null; // null if no breach predicted
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface MetricPrediction {
  metric: string;
  timestamp: string;
  currentValue: number;
  regression: RegressionResult;
  forecast: ForecastPoint[];           // next 3, 6, 12 ticks
  anomaly: AnomalyScore;
  thresholdPrediction: ThresholdPrediction;
}

export interface PredictionResult {
  metric: 'cpu' | 'memory' | 'disk';
  currentValue: number;
  predictedValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  isAnomaly: boolean;
  anomalyScore: number;
  willBreachThreshold: boolean;
  breachThreshold: number;
  confidence: number; // 0-1
  timestamp: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const COLLECTION_INTERVAL_SEC = 5;   // matches engine loop interval
const ANOMALY_Z_THRESHOLD = 2.0;     // Z-score above this = anomaly
const FORECAST_TICKS = [3, 6, 12];   // how many ticks ahead to forecast
const MIN_DATA_POINTS = 10;          // minimum history needed to predict

// ─────────────────────────────────────────────
// 1. Linear Regression (Ordinary Least Squares)
//    Given y = mx + b, solve for m (slope) and b (intercept)
// ─────────────────────────────────────────────

export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;

  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, r2: 0 };
  }

  // x is just the index: 0, 1, 2, ... n-1
  const sumX = (n * (n - 1)) / 2;                          // Σx
  const sumY = values.reduce((a, b) => a + b, 0);          // Σy
  const sumXY = values.reduce((acc, y, x) => acc + x * y, 0); // Σxy
  const sumX2 = values.reduce((acc, _, x) => acc + x * x, 0); // Σx²

  const denom = n * sumX2 - sumX * sumX;

  if (denom === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² = 1 - SS_res / SS_tot
  const meanY = sumY / n;
  const ssTot = values.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const ssRes = values.reduce((acc, y, x) => {
    const predicted = slope * x + intercept;
    return acc + (y - predicted) ** 2;
  }, 0);

  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

// ─────────────────────────────────────────────
// 2. Forecast future values using regression line
// ─────────────────────────────────────────────

export function forecastValues(
  values: number[],
  regression: RegressionResult,
  ticksAheadList: number[] = FORECAST_TICKS
): ForecastPoint[] {
  const n = values.length;

  return ticksAheadList.map((ticksAhead) => {
    const futureX = n - 1 + ticksAhead;
    const predictedValue = regression.slope * futureX + regression.intercept;

    return {
      ticksAhead,
      secondsAhead: ticksAhead * COLLECTION_INTERVAL_SEC,
      // clamp to [0, 100] since these are percentages
      predictedValue: Math.min(100, Math.max(0, parseFloat(predictedValue.toFixed(2)))),
    };
  });
}

// ─────────────────────────────────────────────
// 3. Anomaly Scoring (Z-Score)
//    Z = (x - μ) / σ
//    Measures how many standard deviations the current
//    value is from the historical mean.
// ─────────────────────────────────────────────

export function computeAnomalyScore(values: number[]): AnomalyScore {
  const n = values.length;

  if (n < 2) {
    return { zScore: 0, isAnomaly: false, severity: 'normal' };
  }

  const current = values[n - 1];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { zScore: 0, isAnomaly: false, severity: 'normal' };
  }

  const zScore = parseFloat(((current - mean) / stdDev).toFixed(3));
  const absZ = Math.abs(zScore);
  const isAnomaly = absZ > ANOMALY_Z_THRESHOLD;

  const severity =
    absZ > 3.5 ? 'critical' :
    absZ > ANOMALY_Z_THRESHOLD ? 'warning' :
    'normal';

  return { zScore, isAnomaly, severity };
}

// ─────────────────────────────────────────────
// 4. Threshold Breach Prediction
//    Using the regression slope, estimate how many
//    ticks until a metric crosses a defined threshold.
//    time_to_breach = (threshold - currentValue) / slope
// ─────────────────────────────────────────────

export function predictThresholdBreach(
  values: number[],
  regression: RegressionResult,
  threshold: number
): ThresholdPrediction {
  const n = values.length;
  const currentValue = values[n - 1];

  const trend =
    regression.slope > 0.1 ? 'increasing' :
    regression.slope < -0.1 ? 'decreasing' :
    'stable';

  // Only predict breach if heading toward threshold
  const headingTowardThreshold =
    (currentValue < threshold && regression.slope > 0) ||
    (currentValue > threshold && regression.slope < 0);

  if (!headingTowardThreshold || Math.abs(regression.slope) < 0.01) {
    return {
      willBreach: false,
      breachThreshold: threshold,
      estimatedBreachSeconds: null,
      currentValue: parseFloat(currentValue.toFixed(2)),
      trend,
    };
  }

  // ticks until breach = (threshold - currentValue) / slope
  const ticksUntilBreach = (threshold - currentValue) / regression.slope;

  if (ticksUntilBreach <= 0) {
    // Already breached
    return {
      willBreach: true,
      breachThreshold: threshold,
      estimatedBreachSeconds: 0,
      currentValue: parseFloat(currentValue.toFixed(2)),
      trend,
    };
  }

  const estimatedBreachSeconds = parseFloat(
    (ticksUntilBreach * COLLECTION_INTERVAL_SEC).toFixed(1)
  );

  return {
    willBreach: true,
    breachThreshold: threshold,
    estimatedBreachSeconds,
    currentValue: parseFloat(currentValue.toFixed(2)),
    trend,
  };
}

// ─────────────────────────────────────────────
// 5. Thresholds Configuration
// ─────────────────────────────────────────────

const THRESHOLDS: Record<string, number> = {
  cpu: 85,
  memory: 90,
  disk: 90,
};

// ─────────────────────────────────────────────
// 6. Master: Compute full MetricPrediction
// ─────────────────────────────────────────────

export function computeMetricPrediction(
  metricName: string,
  values: number[]
): MetricPrediction | null {
  if (values.length < MIN_DATA_POINTS) {
    return null; // not enough data yet
  }

  const regression = linearRegression(values);
  const forecast = forecastValues(values, regression);
  const anomaly = computeAnomalyScore(values);
  const threshold = THRESHOLDS[metricName] ?? 90;
  const thresholdPrediction = predictThresholdBreach(values, regression, threshold);

  return {
    metric: metricName,
    timestamp: new Date().toISOString(),
    currentValue: parseFloat(values[values.length - 1].toFixed(2)),
    regression: {
      slope: parseFloat(regression.slope.toFixed(4)),
      intercept: parseFloat(regression.intercept.toFixed(4)),
      r2: parseFloat(regression.r2.toFixed(4)),
    },
    forecast,
    anomaly,
    thresholdPrediction,
  };
}

// ─────────────────────────────────────────────
// Legacy Adapter Class (for backward compatibility)
// ─────────────────────────────────────────────

export class PredictionEngine {
  /**
   * Wrapper for legacy predict method - converts to new MetricPrediction
   */
  public predict(
    metric: 'cpu' | 'memory' | 'disk',
    data: number[],
    thresholds: { cpu: number; memory: number; disk: number }
  ): PredictionResult {
    const threshold = thresholds[metric];
    const regression = linearRegression(data);
    const { predicted } = {
      predicted: regression.slope * (data.length - 1) + regression.intercept
    };
    const { isAnomaly, zScore } = computeAnomalyScore(data);
    const { willBreach } = predictThresholdBreach(data, regression, threshold);

    const current = data.length > 0 ? data[data.length - 1] : 0;
    const trend =
      regression.slope > 0.1 ? 'increasing' :
      regression.slope < -0.1 ? 'decreasing' :
      'stable';

    // Calculate confidence from regression R²
    const confidence = Math.max(0.1, Math.min(1, regression.r2));

    return {
      metric,
      currentValue: Math.round(current * 100) / 100,
      predictedValue: Math.round(predicted * 100) / 100,
      trend: trend as 'increasing' | 'decreasing' | 'stable',
      isAnomaly,
      anomalyScore: Math.round(Math.abs(zScore) * 100) / 100,
      willBreachThreshold: willBreach,
      breachThreshold: threshold,
      confidence: Math.round(confidence * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }
}
