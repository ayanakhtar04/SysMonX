export class TrendAnalyzer {
  /**
   * Checks if the last 5 values in the data array are strictly increasing.
   * Assume data is ordered oldest to newest, though if it's newest to oldest, reverse it.
   */
  public isIncreasingTrend(data: number[]): boolean {
    if (data.length < 5) return false;
    // Take the last 5 elements
    const last5 = data.slice(-5);
    
    for (let i = 1; i < last5.length; i++) {
      if (last5[i] <= last5[i - 1]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Detects a sudden spike (>20% jump) from previous to current value.
   */
  public isSpike(current: number, previous: number): boolean {
    if (typeof previous !== 'number' || typeof current !== 'number') return false;
    // A jump greater than 20 absolute percentage points
    return (current - previous) > 20;
  }
}
