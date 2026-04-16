import os from 'node-os-utils';
const { cpu, mem, drive } = os;

export interface SystemMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
}

export class MetricsCollector {
  private historyLength = 50;
  private history: SystemMetrics[] = [];
  
  public async collect(): Promise<SystemMetrics> {
    try {
      const cpuUsage = await cpu.usage();
      const memInfo = await mem.info();
      // node-os-utils drive module often has issues on Windows. Fallback or handle null/throws.
      let disk = 0;
      try {
        const driveInfo = await drive.info('/');
        disk = parseFloat(driveInfo.usedPercentage.toString());
      } catch (err) {
        disk = 0; // default to 0 if disk reading fails
      }

      const currentMetrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: cpuUsage,
        memory: memInfo.usedMemPercentage,
        disk
      };

      // Add to front, cap at historyLength (circular buffer logic via array methods)
      this.history.unshift(currentMetrics);
      if (this.history.length > this.historyLength) {
        this.history.pop();
      }

      return currentMetrics;
    } catch (error) {
      console.error('[MetricsCollector] Error collecting metrics:', error);
      throw error;
    }
  }

  public getHistory(): SystemMetrics[] {
    return this.history;
  }

  public getCurrentMetrics(): SystemMetrics | null {
    return this.history.length > 0 ? this.history[0] : null;
  }
}
