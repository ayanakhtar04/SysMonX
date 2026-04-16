export interface RuleContext {
  cpu: number[];
  memory: number[];
  disk: number[];
}

export interface Rule {
  name: string;
  condition: (data: RuleContext) => boolean | Promise<boolean>;
  action: () => void | Promise<void>;
  cooldown: number; // in milliseconds
  lastTriggered?: number;
}

export class RuleEngine {
  private rules: Rule[] = [];

  /**
   * Register a new rule for evaluating metrics.
   */
  public addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  /**
   * Evaluate contexts against registered rules. Triggers action on pass (respecting cooldown).
   */
  public async evaluate(context: RuleContext): Promise<void> {
    const now = Date.now();
    for (const rule of this.rules) {
      if (
        !rule.lastTriggered ||
        (now - rule.lastTriggered) >= rule.cooldown
      ) {
        try {
          const triggered = await rule.condition(context);
          if (triggered) {
            console.log(`[RuleEngine] Rule triggered: ${rule.name}`);
            rule.lastTriggered = now;
            await rule.action();
          }
        } catch (error) {
          console.error(`[RuleEngine] Error evaluating rule ${rule.name}:`, error);
        }
      }
    }
  }

  // Bonus: Expose a way to clear states if needed.
  public clearTriggers(): void {
    for (const rule of this.rules) {
      delete rule.lastTriggered;
    }
  }
}
