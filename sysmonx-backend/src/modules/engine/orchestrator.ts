import { MetricsCollector } from '../metrics/metrics.collector';
import { TrendAnalyzer } from './trend.analyzer';
import { ActionsModule } from '../actions/actions.module';
import { LogAnalyzer } from '../logs/log.analyzer';
import { RuleEngine } from '../rules/rule.engine';
import { predictionService } from '../prediction/predictionService';
import { engineStateStore } from './engineState';

export interface AlertHistory {
  id: string;
  timestamp: string;
  message: string;
  level: 'warning' | 'critical';
}

export class EngineOrchestrator {
  private metricsCollector: MetricsCollector;
  private trendAnalyzer: TrendAnalyzer;
  private actionsModule: ActionsModule;
  private logAnalyzer: LogAnalyzer;
  private ruleEngine: RuleEngine;

  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private alertsHistory: AlertHistory[] = [];

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.trendAnalyzer = new TrendAnalyzer();
    this.actionsModule = new ActionsModule();
    this.logAnalyzer = new LogAnalyzer();
    this.ruleEngine = new RuleEngine();

    this.registerExampleRules();
  }

  /**
   * Defines default flexible rules internally to self-heal.
   */
  private registerExampleRules() {
    this.ruleEngine.addRule({
      name: 'High CPU + Memory → restart service',
      // Check if the latest values are > 90 for CPU and > 85 for Mem
      condition: (data) => {
        if (!data.cpu.length || !data.memory.length) return false;
        const latestCpu = data.cpu[data.cpu.length - 1];
        const latestMem = data.memory[data.memory.length - 1];
        return latestCpu > 90 && latestMem > 85;
      },
      action: async () => {
        const msg = 'Condition (High CPU + Memory) met. Triggering repair rule. Restarting `sysmonx-core`.';
        this.addAlert(msg, 'critical');
        this.actionsModule.sendAlert(msg);
        await this.actionsModule.restartService('sysmonx-core');
      },
      cooldown: 60000 * 5, // 5 min
    });

    this.ruleEngine.addRule({
      name: 'Increasing CPU trend → send warning alert',
      condition: (data) => {
        // We use trend analyzer
        return this.trendAnalyzer.isIncreasingTrend(data.cpu);
      },
      action: async () => {
        const msg = 'Consistent increase in CPU detected across last 5 intervals.';
        this.addAlert(msg, 'warning');
        this.actionsModule.sendAlert(msg);
      },
      cooldown: 60000, // 1 min
    });

    this.ruleEngine.addRule({
      name: 'Disk > 90% → cleanup logs',
      condition: (data) => {
         if (!data.disk.length) return false;
         return data.disk[data.disk.length - 1] > 90;
      },
      action: async () => {
         const msg = 'Disk utilization critical (>90%). Cleaning logs.';
         this.addAlert(msg, 'critical');
         this.actionsModule.sendAlert(msg);
         // Ensure correct dir based on setup
         await this.actionsModule.cleanupLogs('/var/log/sysmonx');
      },
      cooldown: 60000 * 10 // 10 min
    });
  }

  /**
   * Starts the orchestration loop.
   */
  public start(intervalMs = 5000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log(`[Engine] Starting Self-Healing & Intelligence Orchestrator (${intervalMs}ms interval)`);
    this.intervalId = setInterval(async () => {
      try {
        await this.orchestrationTick();
      } catch (err) {
        console.error(`[Engine] Orchestration tick failed:`, err);
      }
    }, intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[Engine] Stopped.');
  }

  /**
   * Run one lifecycle of metrics collection and rule evaluation
   */
  private async orchestrationTick() {
    await this.metricsCollector.collect();
    
    // Periodically run log analysis (e.g., assuming a specific file path)
    // We could do this on a different interval, but for the assignment we run it.
    try {
      const logAlerts = await this.logAnalyzer.analyzeLog('/var/log/sysmonx/error.log');
      logAlerts.forEach(alert => {
        this.addAlert(`Log detected ${alert.keyword}: ${alert.line}`, 'warning');
      });
    } catch(err) {
      // ignore missing file
    }

    const history = this.metricsCollector.getHistory();
    // history is [newest, newest-1, ..., oldest] because of unshift.
    // reverse to [oldest, oldest+1, ..., newest] for simple array logic.
    const reversed = [...history].reverse();
    
    // Build metric buffers for prediction engine
    const metricBuffers = {
      cpu: reversed.map(m => m.cpu),
      memory: reversed.map(m => m.memory),
      disk: reversed.map(m => m.disk),
    };
    
    // Run prediction engine and store snapshot
    const predictionSnapshot = await predictionService.runPredictions(metricBuffers);
    engineStateStore.setLatestPredictionSnapshot(predictionSnapshot);
    
    // Alert on prediction alerts
    for (const alert of predictionSnapshot.alerts) {
      this.addAlert(alert.message, alert.severity === 'critical' ? 'critical' : 'warning');
    }
    
    // Evaluate via rules (with access to prediction helpers via engineStateStore)
    await this.ruleEngine.evaluate(metricBuffers);
  }

  public addAlert(message: string, level: 'warning' | 'critical' = 'warning') {
    this.alertsHistory.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      message,
      level,
    });
    // keep last 100 alerts
    if (this.alertsHistory.length > 100) this.alertsHistory.pop();
  }

  // Getters for Express API
  public getMetricsHistory() {
    return this.metricsCollector.getHistory();
  }
  
  public getCurrentMetrics() {
    return this.metricsCollector.getCurrentMetrics();
  }
  
  public getAlerts() {
    return this.alertsHistory;
  }
  
  public getStatus() {
    const current = this.getCurrentMetrics();
    let health = 'healthy';
    if (!current) return { health: 'unknown' };

    if (current.cpu > 85 || current.memory > 85 || current.disk > 90) {
      health = 'critical';
    } else if (current.cpu > 70 || current.memory > 70 || current.disk > 75) {
      health = 'warning';
    }

    return {
      status: health,
      uptime: process.uptime(),
      latestMetrics: current
    };
  }
}

// Export singleton instance
export const engineOrchestrator = new EngineOrchestrator();
