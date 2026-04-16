# Quick Start: Prediction Engine

## 🚀 Start the Backend

```bash
cd sysmonx-backend
npm run dev
```

You'll see in the console:
```
SysMonX backend listening on port 5000
[Engine] Starting Self-Healing & Intelligence Orchestrator (5000ms interval)
```

## ⏳ Wait for Warmup

The prediction engine needs **~30 seconds** to gather enough historical data (50 values).

## 📊 Test the Endpoints

### Get Full Predictions
```bash
curl http://localhost:5000/api/predictions | jq
```

Expected (after 30+ seconds):
```json
{
  "success": true,
  "data": {
    "timestamp": "2026-04-11T10:30:45.123Z",
    "predictions": {
      "cpu": {
        "currentValue": 45.2,
        "predictedValue": 48.7,
        "trend": "increasing",
        "isAnomaly": false,
        "willBreachThreshold": false,
        "confidence": 0.75
      },
      "memory": { "..." },
      "disk": { "..." }
    },
    "alerts": [],
    "willBreachSoon": { "cpu": false, "memory": false, "disk": false },
    "isAnomalous": { "cpu": false, "memory": false, "disk": false }
  }
}
```

### Get All Alerts
```bash
curl http://localhost:5000/api/predictions/alerts | jq
```

### Get CPU Predictions Only
```bash
curl http://localhost:5000/api/predictions/cpu | jq
```

Similar for memory and disk:
```bash
curl http://localhost:5000/api/predictions/memory | jq
curl http://localhost:5000/api/predictions/disk | jq
```

## 📈 Trigger an Alert (Optional)

To see the system detect anomalies:

1. **Manually stress test a metric** on the VM:
   ```bash
   # Spike CPU
   stress-ng --cpu 4 --timeout 10s
   
   # Or fill memory
   stress-ng --vm 1 --vm-bytes 90% --timeout 10s
   ```

2. **Watch predictions endpoint** for anomaly/breach alerts

## 🔗 Integration with Rules

Rules can now use prediction helpers:

```typescript
import { engineStateStore } from '../modules/engine/engineState';

this.ruleEngine.addRule({
  name: 'Proactive CPU management',
  condition: () => {
    // Only trigger if CPU will breach soon AND is trending up
    return engineStateStore.willBreachSoon();
  },
  action: async () => {
    // Take preventive action
    await this.actionsModule.sendAlert('CPU will breach - scaling up resources');
  },
  cooldown: 60000
});
```

## 📚 Files Overview

| File | Purpose |
|------|---------|
| `src/modules/prediction/predictionEngine.ts` | Core algorithms (linear regression, Z-score, threshold) |
| `src/modules/prediction/predictionService.ts` | Orchestrates predictions, alerts, cooldowns |
| `src/modules/engine/engineState.ts` | Singleton state store for predictions |
| `src/modules/engine/engineIntegration.ts` | Integration guide |
| `src/routes/predictions.ts` | Express endpoints for predictions |

## ❌ Troubleshooting

### `Predictions not yet available`
- **Cause**: Engine hasn't warmed up yet
- **Fix**: Wait 30+ seconds, retry

### All metrics showing `stable` trend
- **Cause**: Metrics aren't varying much
- **Fix**: Normal! Means system is stable. Stress-test if you want to see changes.

### Backend crashes on startup
- **Cause**: Import path issue
- **Fix**: Verify all imports use relative paths like `'../prediction/predictionService'`

## 🎯 What's Integrated

✅ Predictions run every 5 seconds in orchestrator tick  
✅ Alerts generated with 1-minute cooldown  
✅ Full prediction data stored in `engineStateStore`  
✅ Rules engine can access `willBreachSoon()`, `isAnomalous()` helpers  
✅ Express endpoints live at `/api/predictions/*`  
✅ Zero external dependencies added  
✅ TypeScript strict mode passes  

---

**Status**: Ready to use! No additional configuration needed.
