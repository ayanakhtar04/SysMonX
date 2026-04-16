# SysMonX Prediction Engine Integration

## Overview

The Prediction Engine adds intelligent forecasting to SysMonX, detecting anomalies and predicting metric threshold breaches before they occur.

## Architecture

### Module Structure

```
src/modules/prediction/
├── predictionEngine.ts      # Core math engine (linear regression, Z-score)
└── predictionService.ts     # Orchestrator, alerts, cooldowns

src/modules/engine/
├── orchestrator.ts          # Main loop (now runs predictions)
├── engineState.ts           # Shared state store
└── engineIntegration.ts     # Integration guide & notes
```

### How It Works

1. **MetricsCollector** collects CPU, memory, disk every 5s (existing)
2. **PredictionEngine** analyzes the last 50 values using:
   - **Linear Regression**: Predicts next value and determines trend (increasing/decreasing/stable)
   - **Z-Score Anomaly Detection**: Identifies outliers > 2 std devs from mean
   - **Threshold Breach Prediction**: Forecasts if metric will exceed threshold
3. **PredictionService** runs predictions, generates alerts, manages cooldowns (1 min between same alerts)
4. **EngineState** stores latest snapshot and provides helper methods
5. **Orchestrator** integrates predictions into the 5-second tick loop

### API Endpoints

#### `GET /api/predictions`
Returns latest prediction snapshot for all metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-04-11T10:30:45.123Z",
    "predictions": {
      "cpu": {
        "metric": "cpu",
        "currentValue": 45.2,
        "predictedValue": 48.7,
        "trend": "increasing",
        "isAnomaly": false,
        "anomalyScore": 0.5,
        "willBreachThreshold": false,
        "breachThreshold": 85,
        "confidence": 0.75,
        "timestamp": "2026-04-11T10:30:45.123Z"
      },
      "memory": { /* ... */ },
      "disk": { /* ... */ }
    },
    "alerts": [ /* prediction-generated alerts */ ],
    "willBreachSoon": { "cpu": false, "memory": true, "disk": false },
    "isAnomalous": { "cpu": false, "memory": false, "disk": false }
  }
}
```

#### `GET /api/predictions/alerts`
Returns all prediction alerts from history (last 200 stored).

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "a1b2c3",
      "timestamp": "2026-04-11T10:30:45.123Z",
      "metric": "memory",
      "type": "breach_warning",
      "message": "memory predicted to exceed 85% threshold (predicted: 87.5%)",
      "severity": "warning",
      "data": {
        "current": 82.3,
        "predicted": 87.5,
        "threshold": 85
      }
    }
  ]
}
```

#### `GET /api/predictions/:metric`
Returns detailed prediction for a specific metric (cpu, memory, disk).

**Example:** `GET /api/predictions/cpu`

**Response:**
```json
{
  "success": true,
  "data": {
    "prediction": { /* full prediction result */ },
    "recentAlerts": [ /* last 10 alerts for this metric */ ]
  }
}
```

## Alert Types

### 1. Anomaly Detection
- Triggered when: Current value is > 2 standard deviations from mean
- Severity: **warning**
- Cooldown: 1 minute

### 2. Breach Warning
- Triggered when: Linear regression predicts threshold breach with > 60% confidence
- Severity: **warning** (or **critical** if already breached)
- Cooldown: 1 minute

### 3. Increasing Trend
- Triggered when: Last 5 values show consistent increase and predicted > current * 1.1
- Only raises if current is < 80% of threshold (to avoid duplicate breach alerts)
- Severity: **info**
- Cooldown: 1 minute

## Integration with Rules Engine

Rules can now access prediction helpers via `engineStateStore`:

```typescript
import { engineStateStore } from '../modules/engine/engineState';

// In rule conditions:
condition: () => engineStateStore.willBreachSoon()  // any metric breaching soon?
condition: () => engineStateStore.isAnomalous()     // any metric anomalous?
condition: () => engineStateStore.getBreachers()    // get list of breaching metrics
condition: () => engineStateStore.getAnomalies()    // get list of anomalous metrics
```

## Thresholds

Default thresholds (tunable in `predictionService.ts`):
- CPU: **85%**
- Memory: **85%**
- Disk: **90%**

## Performance

- **Computation**: O(n) for each metric per tick (where n=50 historical values)
- **Memory**: ~800 bytes per metric (50 float values + metadata)
- **Latency**: <10ms per tick on most systems

## Example: High CPU Increasing Trend + Prediction

Scenario: CPU is at 70% and trending upward, predicted to reach 88%.

1. **MetricsCollector** records 70% CPU
2. **PredictionEngine** detects increasing trend, predicts 88%
3. **PredictionService** raises alert: "Increasing trend detected on cpu"
4. **Orchestrator** stores snapshot, forwards alert
5. **Rules** can now react: restart process, scale up, etc.

## Extending Predictions

To add custom predictions:

1. Add method to `PredictionEngine` class
2. Call it from `PredictionService.runPredictions()`
3. Generate alerts if thresholds breached
4. Access from routes or rules via `engineStateStore`

## Testing

```bash
# Start backend with prediction engine
npm run dev

# Test prediction endpoint
curl http://localhost:5000/api/predictions

# Test alerts
curl http://localhost:5000/api/predictions/alerts

# Test specific metric
curl http://localhost:5000/api/predictions/cpu
```

## Troubleshooting

### No predictions returned
- Predictions need ~5-10 ticks (25-50 seconds) to warm up with historical data
- Wait, then retry the endpoint

### All metrics showing as stable
- Metrics must vary by > 0.5% to register slope in linear regression
- Check if system load is actually changing

### Too many duplicate alerts
- Cooldown is 1 minute per alert type per metric
- Customize `alertCooldown` in `PredictionService` constructor
