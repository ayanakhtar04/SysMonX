import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = util.promisify(exec);

export class ActionsModule {
  /**
   * Restarts a PM2 managed service. Uses child_process to execute pm2.
   */
  public async restartService(serviceName: string): Promise<void> {
    try {
      console.log(`[ActionsModule] Attempting to restart service: ${serviceName}`);
      const { stdout, stderr } = await execPromise(`pm2 restart ${serviceName}`);
      if (stderr) console.warn(`[ActionsModule] Restart Output: ${stderr}`);
      else console.log(`[ActionsModule] Restart Success: ${stdout.trim()}`);
    } catch (err: any) {
      console.error(`[ActionsModule] Failed to restart service ${serviceName}:`, err.message);
    }
  }

  /**
   * Cleans up all log files in a specific directory.
   */
  public async cleanupLogs(directory: string): Promise<void> {
    try {
      console.log(`[ActionsModule] Cleaning up logs in directory: ${directory}`);
      if (!fs.existsSync(directory)) {
        console.warn(`[ActionsModule] Directory ${directory} not found.`);
        return;
      }

      const files = await fs.promises.readdir(directory);
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(directory, file);
          await fs.promises.unlink(filePath);
          console.log(`[ActionsModule] Deleted log file: ${file}`);
        }
      }
    } catch (err: any) {
      console.error(`[ActionsModule] Failed to cleanup logs:`, err.message);
    }
  }

  /**
   * Simple alerting, for now just sending to console.
   */
  public sendAlert(message: string): void {
    console.warn(`[ALERT] ${new Date().toISOString()} - ${message}`);
  }
}
