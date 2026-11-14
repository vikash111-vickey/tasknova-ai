import { v4 as uuidv4 } from 'uuid';
import { ChaosFault, ChaosFaultType, TaskStep } from '../../types/models';
import { getRepository } from '../../repository';

export class ChaosEngine {
  private static instance: ChaosEngine;

  private constructor() {}

  public static getInstance(): ChaosEngine {
    if (!ChaosEngine.instance) {
      ChaosEngine.instance = new ChaosEngine();
    }
    return ChaosEngine.instance;
  }

  /**
   * Registers a selectable chaos fault for a signed-in user in demo mode.
   */
  public async injectFault(
    userId: string,
    faultType: ChaosFaultType,
    target = '',
    occurrences = 1
  ): Promise<ChaosFault> {
    const repo = getRepository();
    const fault: ChaosFault = {
      id: uuidv4(),
      userId,
      target: target.toLowerCase(),
      faultType,
      remainingOccurrences: occurrences,
      active: true,
      createdAt: new Date().toISOString(),
    };

    return repo.createChaosFault(fault);
  }

  /**
   * Gets all active faults for a user.
   */
  public async getActiveFaults(userId: string): Promise<ChaosFault[]> {
    const repo = getRepository();
    const faults = await repo.getChaosFaults(userId);
    return faults.filter((f) => f.active && f.remainingOccurrences > 0);
  }

  /**
   * Clears all faults for a user.
   */
  public async clearFaults(userId: string): Promise<boolean> {
    const repo = getRepository();
    return repo.clearChaosFaults(userId);
  }

  /**
   * Evaluates whether a chaos fault should be triggered on this step execution.
   * Only active in demo mode.
   * Decrements remainingOccurrences and deactivates when exhausted.
   * Throws real errors into the execution path to force recovery engine engagement.
   */
  public async maybeTriggerFault(step: TaskStep, userId: string, mode: 'demo' | 'live'): Promise<void> {
    // Chaos engine is strictly restricted to DEMO mode
    if (mode !== 'demo') {
      return;
    }

    const repo = getRepository();
    const faults = await repo.getChaosFaults(userId);
    const activeFaults = faults.filter((f) => f.active && f.remainingOccurrences > 0);

    if (activeFaults.length === 0) {
      return;
    }

    const stepId = step.id.toLowerCase();
    const stepName = step.name.toLowerCase();
    const action = step.action.toLowerCase();
    const tool = (step.tool || '').toLowerCase();

    for (const fault of activeFaults) {
      const target = (fault.target || '').toLowerCase();

      // Check if this fault targets this step
      const matches =
        target === '' ||
        target === '*' ||
        stepId.includes(target) ||
        stepName.includes(target) ||
        action.includes(target) ||
        tool.includes(target);

      if (matches) {
        console.warn(`[ChaosEngine] INJECTING FAULT [${fault.faultType}] on step "${step.name}" (${step.action})!`);

        // Decrement occurrences
        const remaining = fault.remainingOccurrences - 1;
        await repo.updateChaosFault(fault.id, {
          remainingOccurrences: remaining,
          active: remaining > 0,
        });

        // Trigger real error through the real code path
        switch (fault.faultType) {
          case 'network_timeout':
            throw new Error(`ETIMEDOUT: Network timeout communicating with provider for "${step.action}" [CHAOS_FAULT]`);

          case 'auth_expiry':
            throw new Error(`AUTH_EXPIRED: 401 Unauthorized - OAuth access token expired for "${tool}" [CHAOS_FAULT]`);

          case 'provider_503':
            throw new Error(`HTTP 503: Service Unavailable from provider endpoint [CHAOS_FAULT]`);

          case 'verification_mismatch':
            throw new Error(`Verification mismatch: Provider state does not match expected output payload [CHAOS_FAULT]`);

          default:
            throw new Error(`Chaos fault: ${fault.faultType} triggered [CHAOS_FAULT]`);
        }
      }
    }
  }
}
