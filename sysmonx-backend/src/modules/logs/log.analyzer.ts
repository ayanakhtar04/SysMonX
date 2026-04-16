import fs from 'fs';
import readline from 'readline';

export interface LogAlert {
  keyword: string;
  line: string;
  timestamp: Date;
}

export class LogAnalyzer {
  private keywords = ['ERROR', 'OutOfMemory', 'UnhandledPromiseRejection'];

  /**
   * Reads logs from a file path and detects keywords.
   * Returns a structured list of alerts found in the log file.
   */
  public async analyzeLog(filePath: string): Promise<LogAlert[]> {
    const alerts: LogAlert[] = [];
    if (!fs.existsSync(filePath)) {
      console.warn(`[LogAnalyzer] Log file not found at ${filePath}`);
      return alerts;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      for (const keyword of this.keywords) {
        if (line.includes(keyword)) {
          alerts.push({
            keyword,
            line,
            timestamp: new Date()
          });
        }
      }
    }
    return alerts;
  }
}
