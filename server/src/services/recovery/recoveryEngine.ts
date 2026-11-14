import { v4 as uuidv4 } from 'uuid';
import { TaskStep, ErrorCategory, RecoveryStrategy, ExecutionEvent } from '../../types/models';
import { TaskStateMachine } from '../execution/stateMachine';
import { SSEBroker } from '../../sse/broker';
import { getRepository } from '../../repository';
import { DemoStore } from '../../connectors/demoStore';
import { ConnectorRegistry } from '../../connectors';

export interface RecoveryActionPlan {
  category: ErrorCategory;
  strategy: RecoveryStrategy;
  canAutoRecover: boolean;
  explanation: string;
  delayMs?: number;
}

export class RecoveryEngine {
  private static instance: RecoveryEngine;

  private constructor() {}

  public static getInstance(): RecoveryEngine {
    if (!RecoveryEngine.instance) {
      RecoveryEngine.instance = new RecoveryEngine();
    }
    return RecoveryEngine.instance;
  }

  /**
   * Classifies arbitrary errors into standardized resilience categories.
   */
  public classifyError(err: unknown): ErrorCategory {
    const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
    const status = (err as any)?.status || (err as any)?.statusCode;

    if (
      status === 503 ||
      message.includes('503') ||
      message.includes('provider unavailable') ||
      message.includes('service unavailable')
    ) {
      return 'provider_unavailable';
    }

    if (
      status === 401 ||
      message.includes('auth_expiry') ||
      message.includes('unauthorized') ||
      message.includes('token expired') ||
      message.includes('jwt expired') ||
      message.includes('auth expired')
    ) {
      return 'auth';
    }

    if (status === 403 || message.includes('forbidden') || message.includes('permission denied')) {
      return 'permission';
    }

    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }

    if (
      status === 404 ||
      message.includes('not found') ||
      message.includes('missing')
    ) {
      return 'not_found';
    }

    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('network')
    ) {
      return 'network';
    }

    if (
      message.includes('mismatch') ||
      message.includes('verification') ||
      message.includes('evidence mismatch')
    ) {
      return 'verification_mismatch';
    }

    if (status === 400 || message.includes('invalid') || message.includes('validation')) {
      return 'invalid_input';
    }

    return 'unknown';
  }

  /**
   * Formulates a recovery policy based on step action and error category.
   * Enforces rules:
   * - Never retry destructive operations.
   * - Check-before-retry for uncertain outcomes (especially email sends).
   * - Never silently change destination.
   */
  public determineRecoveryPlan(step: TaskStep, category: ErrorCategory, attempt: number): RecoveryActionPlan {
    const action = step.action.toLowerCase();
    const isDestructive = action.includes('delete') || action.includes('remove') || action.includes('purge');

    if (isDestructive) {
      return {
        category,
        strategy: 'human_intervention',
        canAutoRecover: false,
        explanation: 'Destructive operation failed. Automated retry prohibited to prevent data loss. Escalating to operator.',
      };
    }

    if (category === 'auth') {
      return {
        category,
        strategy: 'retry_safe',
        canAutoRecover: true,
        delayMs: 150,
        explanation: 'Auth token refreshed. Safe to retry operation.',
      };
    }

    if (category === 'provider_unavailable') {
      const backoff = 200 * Math.pow(2, attempt);
      return {
        category,
        strategy: 'check_before_retry',
        canAutoRecover: attempt <= 3,
        delayMs: backoff,
        explanation: `Provider returned 503 Service Unavailable. Backing off ${backoff}ms with check-before-retry.`,
      };
    }

    if (category === 'network') {
      // If action is external communication, MUST check-before-retry
      if (action.includes('send') || action.includes('email') || action.includes('upload')) {
        return {
          category,
          strategy: 'check_before_retry',
          canAutoRecover: attempt <= 3,
          delayMs: 100 * attempt,
          explanation: 'Network timeout during external operation. Checking provider state before any retry to prevent duplicate dispatch.',
        };
      }
      return {
        category,
        strategy: 'retry_safe',
        canAutoRecover: attempt <= 3,
        delayMs: 100 * attempt,
        explanation: 'Transient network failure on idempotent operation. Retrying with backoff.',
      };
    }

    if (category === 'rate_limit') {
      const delay = 300 * Math.pow(2, attempt);
      return {
        category,
        strategy: 'check_before_retry',
        canAutoRecover: attempt <= 3,
        delayMs: delay,
        explanation: `Rate limit encountered. Waiting ${delay}ms before check-before-retry.`,
      };
    }

    if (category === 'verification_mismatch') {
      return {
        category,
        strategy: attempt === 1 ? 'check_before_retry' : 'human_intervention',
        canAutoRecover: attempt === 1,
        delayMs: 200,
        explanation: attempt === 1
          ? 'Verification mismatch. Performing delayed re-check of provider state.'
          : 'Persistent verification mismatch after re-check. Escalating to human operator.',
      };
    }

    if (category === 'permission' || category === 'invalid_input') {
      return {
        category,
        strategy: 'human_intervention',
        canAutoRecover: false,
        explanation: `Non-retryable ${category} error. Operator intervention required.`,
      };
    }

    return {
      category,
      strategy: attempt <= 2 ? 'check_before_retry' : 'human_intervention',
      canAutoRecover: attempt <= 2,
      delayMs: 200,
      explanation: 'Unclassified error. Applying check-before-retry heuristic.',
    };
  }

  /**
   * Executes the check-before-retry state inquiry.
   * For emails: verifies if email was already accepted by provider mail server outbox!
   * For drive: verifies if file was already stored in drive!
   */
  public async checkPreExistingSuccess(step: TaskStep, context: { taskId: string; mode: string }): Promise<{ alreadySucceeded: boolean; result?: any }> {
    const action = step.action.toLowerCase();
    const demoStore = DemoStore.getInstance();

    if (action.includes('send') || action.includes('email')) {
      const payload = (step.input || {}) as Record<string, unknown>;
      const expectedRecipient = String(payload.recipient || payload.to || '');
      const expectedSubject = String(payload.subject || '');

      // Check if matching email already exists in outbox
      const existing = demoStore.outbox.find(
        (o) =>
          o.recipient === expectedRecipient &&
          (expectedSubject === '' || o.subject.includes(expectedSubject.substring(0, 10)))
      );

      if (existing) {
        console.log(`[RecoveryEngine] Check-before-retry: Found existing email in outbox (${existing.id}). Preventing duplicate send!`);
        return {
          alreadySucceeded: true,
          result: {
            success: true,
            data: existing,
            message: 'Adopted existing outbox dispatch during check-before-retry. Duplicate send prevented. [DEMO]',
            mode: 'demo',
            outputRef: existing.id,
          },
        };
      }
    }

    if (action.includes('upload') || action.includes('drive')) {
      const payload = (step.input || {}) as Record<string, unknown>;
      const fileName = String(payload.name || payload.fileName || '');
      const existingFile = demoStore.driveFiles.find((f) => f.name === fileName);
      if (existingFile) {
        console.log(`[RecoveryEngine] Check-before-retry: Found existing Drive file (${existingFile.id}).`);
        return {
          alreadySucceeded: true,
          result: {
            success: true,
            data: existingFile,
            message: `Adopted existing drive file "${fileName}". [DEMO]`,
            mode: 'demo',
            outputRef: existingFile.id,
          },
        };
      }
    }

    return { alreadySucceeded: false };
  }

  /**
   * Emits recovery event and notifies subscribers.
   */
  public async logRecoveryAttempt(
    taskId: string,
    userId: string,
    step: TaskStep,
    attempt: number,
    plan: RecoveryActionPlan
  ): Promise<void> {
    const repo = getRepository();
    const now = new Date().toISOString();

    // Transition state machine to RECOVERY_IN_PROGRESS if running
    const sm = TaskStateMachine.getInstance();
    const task = await repo.getTaskById(taskId, userId);
    if (task && (task.status === 'RUNNING' || task.status === 'VERIFYING')) {
      try {
        await sm.transition(taskId, 'RECOVERY_IN_PROGRESS', {
          userId,
          reason: `Recovery initiated for step "${step.name}": ${plan.explanation}`,
          stepId: step.id,
          payload: { attempt, category: plan.category, strategy: plan.strategy },
        });
      } catch (err) {
        // Log transition failure gracefully
        console.warn('[RecoveryEngine] State transition warning:', err);
      }
    }

    // Persist recovery execution event
    const event: ExecutionEvent = {
      id: uuidv4(),
      taskId,
      userId,
      stepId: step.id,
      type: 'recovery',
      message: `Recovery Attempt ${attempt} for "${step.name}" [${plan.category}]: ${plan.explanation}`,
      payload: {
        attempt,
        category: plan.category,
        strategy: plan.strategy,
        action: step.action,
        delayMs: plan.delayMs,
      },
      timestamp: now,
    };

    await repo.createExecutionEvent(event);
    await SSEBroker.getInstance().broadcastEvent(event);
  }
}
