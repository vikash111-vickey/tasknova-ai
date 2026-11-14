import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, Task, ExecutionEvent } from '../../types/models';
import { getRepository } from '../../repository';
import { SSEBroker } from '../../sse/broker';

export class IllegalStateTransitionError extends Error {
  public from: TaskStatus;
  public to: TaskStatus;
  public taskId: string;

  constructor(taskId: string, from: TaskStatus, to: TaskStatus) {
    super(`Illegal state transition for task "${taskId}": cannot transition from "${from}" to "${to}".`);
    this.name = 'IllegalStateTransitionError';
    this.taskId = taskId;
    this.from = from;
    this.to = to;
  }
}

// Exactly the 11 states specified in Section 11 of docs/MASTER_PROMPT.md
export const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  CREATED: ['PLANNING', 'QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'CANCELLED'],
  PLANNING: ['AWAITING_APPROVAL', 'QUEUED', 'RUNNING', 'FAILED', 'CANCELLED'],
  AWAITING_APPROVAL: ['QUEUED', 'RUNNING', 'FAILED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'CANCELLED'],
  RUNNING: [
    'VERIFYING',
    'AWAITING_APPROVAL',
    'COMPLETED',
    'PARTIALLY_COMPLETED',
    'FAILED',
    'RECOVERY_IN_PROGRESS',
    'CANCELLED',
  ],
  VERIFYING: [
    'RUNNING',
    'COMPLETED',
    'PARTIALLY_COMPLETED',
    'FAILED',
    'RECOVERY_IN_PROGRESS',
    'CANCELLED',
  ],
  RECOVERY_IN_PROGRESS: ['RUNNING', 'PARTIALLY_COMPLETED', 'FAILED', 'CANCELLED'],
  PARTIALLY_COMPLETED: ['QUEUED', 'RUNNING', 'CANCELLED'],
  FAILED: ['QUEUED', 'RUNNING', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  // Backwards compatibility with lower-case statuses
  pending: ['planning', 'PLANNING', 'QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'CANCELLED', 'cancelled'],
  planning: ['AWAITING_APPROVAL', 'QUEUED', 'RUNNING', 'failed', 'FAILED', 'cancelled', 'CANCELLED'],
  executing: ['verifying', 'VERIFYING', 'completed', 'COMPLETED', 'failed', 'FAILED', 'CANCELLED', 'cancelled'],
  verifying: ['executing', 'RUNNING', 'completed', 'COMPLETED', 'failed', 'FAILED', 'CANCELLED', 'cancelled'],
  completed: [],
  failed: ['pending', 'QUEUED', 'RUNNING', 'CANCELLED', 'cancelled'],
  cancelled: [],
};

export class TaskStateMachine {
  private static instance: TaskStateMachine;

  public static getInstance(): TaskStateMachine {
    if (!TaskStateMachine.instance) {
      TaskStateMachine.instance = new TaskStateMachine();
    }
    return TaskStateMachine.instance;
  }

  public canTransition(from: TaskStatus, to: TaskStatus): boolean {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  public async transition(
    taskId: string,
    targetState: TaskStatus,
    context?: {
      reason?: string;
      stepId?: string;
      payload?: Record<string, unknown>;
      userId?: string;
    }
  ): Promise<Task> {
    const repo = getRepository();
    const task = await repo.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id "${taskId}" not found.`);
    }

    const currentState = task.status;

    if (!this.canTransition(currentState, targetState)) {
      const err = new IllegalStateTransitionError(taskId, currentState, targetState);
      console.error(`[StateMachine] ${err.message}`);
      throw err;
    }

    if (currentState === targetState) {
      return task;
    }

    const now = new Date().toISOString();
    const updated = await repo.updateTask(taskId, {
      status: targetState,
      updatedAt: now,
    });

    if (!updated) {
      throw new Error(`Failed to update status for task "${taskId}".`);
    }

    // Write execution_event and broadcast over SSE
    const event: ExecutionEvent = {
      id: uuidv4(),
      taskId,
      userId: context?.userId || task.userId,
      stepId: context?.stepId,
      type: 'status_change',
      message: context?.reason || `Task transitioned from ${currentState} to ${targetState}.`,
      payload: {
        from: currentState,
        to: targetState,
        taskId,
        stepId: context?.stepId,
        ...context?.payload,
      },
      timestamp: now,
    };

    await repo.createExecutionEvent(event);
    await SSEBroker.getInstance().broadcastEvent(event);

    return updated;
  }
}
