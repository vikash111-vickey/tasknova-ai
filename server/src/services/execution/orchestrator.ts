import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStep, ExecutionEvent } from '../../types/models';
import { getRepository } from '../../repository';
import { TaskStateMachine } from './stateMachine';
import { ApprovalEngine } from './approvalEngine';
import { ConnectorRegistry } from '../../connectors';
import { SSEBroker } from '../../sse/broker';
import { DataExtractor } from './dataExtractor';
import { DemoStore } from '../../connectors/demoStore';
import { VerificationEngine } from '../verification/verificationEngine';
import { TrustScoreCalculator } from '../verification/trustScore';
import { RecoveryEngine } from '../recovery/recoveryEngine';
import { ChaosEngine } from '../recovery/chaosEngine';
import { PlanningPipeline } from '../planning/pipeline';

export class Orchestrator {
  private static instance: Orchestrator;
  private activeExecutions = new Map<string, Promise<Task>>();
  private cancelledTasks = new Set<string>();
  private taskRecoveriesCount = new Map<string, number>();
  private maxConcurrency = 3;

  public static getInstance(): Orchestrator {
    if (!Orchestrator.instance) {
      Orchestrator.instance = new Orchestrator();
    }
    return Orchestrator.instance;
  }

  public computeIdempotencyKey(taskId: string, stepId: string, input: Record<string, unknown>): string {
    const sortedKeys = Object.keys(input || {}).sort();
    const normalized: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      normalized[k] = input[k];
    }
    const serialized = `${taskId}:${stepId}:${JSON.stringify(normalized)}`;
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  public isTaskRunning(taskId: string): boolean {
    return this.activeExecutions.has(taskId);
  }

  public runTask(taskId: string, userId: string): Promise<Task> {
    // 1. Lock check: Return existing execution if already running
    const existing = this.activeExecutions.get(taskId);
    if (existing) {
      console.log(`[Orchestrator] Task "${taskId}" is already running. Returning existing execution lock.`);
      return existing;
    }

    const executionPromise = this.executeTaskPipeline(taskId, userId).finally(() => {
      this.activeExecutions.delete(taskId);
    });

    this.activeExecutions.set(taskId, executionPromise);
    return executionPromise;
  }

  public async cancelTask(taskId: string, userId: string, reason = 'Operator cancelled execution'): Promise<Task> {
    this.cancelledTasks.add(taskId);

    const repo = getRepository();
    const task = await repo.getTaskById(taskId, userId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found.`);
    }

    // Cancel pending steps, preserve completed
    const steps = await repo.getTaskSteps(taskId);
    for (const step of steps) {
      if (step.status === 'pending' || step.status === 'running') {
        await repo.updateTaskStep(step.id, {
          status: 'skipped',
          error: 'Cancelled by operator',
        });
      }
    }

    return TaskStateMachine.getInstance().transition(taskId, 'CANCELLED', {
      reason,
      userId,
    });
  }

  private async executeTaskPipeline(taskId: string, userId: string): Promise<Task> {
    const repo = getRepository();
    this.cancelledTasks.delete(taskId);

    let task = await repo.getTaskById(taskId, userId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found.`);
    }

    // If task is already completed, cancelled, or failed, return immediately
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || task.status === 'FAILED') {
      return task;
    }

    // Transition to QUEUED then RUNNING
    const stateMachine = TaskStateMachine.getInstance();
    if (task.status === 'CREATED' || task.status === 'pending' || task.status === 'AWAITING_APPROVAL') {
      task = await stateMachine.transition(taskId, 'QUEUED', { userId });
    }
    if (task.status === 'QUEUED') {
      task = await stateMachine.transition(taskId, 'RUNNING', { userId });
    }

    const approvalEngine = ApprovalEngine.getInstance();
    const connectorRegistry = ConnectorRegistry.getInstance();

    // Map of step outputs for downstream dependencies
    const stepOutputs = new Map<string, unknown>();

    // Load initial step outputs from repository if resuming (or reconstruct from plan if empty)
    let initialSteps = await repo.getTaskSteps(taskId);
    if (initialSteps.length === 0 && (!task.plan || !(task.plan as any).steps)) {
      console.log(`[Orchestrator] Task "${taskId}" has no steps or plan. Auto-generating plan from instruction.`);
      try {
        const planningPipeline = new PlanningPipeline();
        const planResult = await planningPipeline.generate(task.instructions || task.title, userId);
        task = (await repo.updateTask(taskId, { plan: planResult.plan as any }, userId)) || task;
      } catch (err) {
        console.warn(`[Orchestrator] Auto-planning failed:`, err);
      }
    }

    if (initialSteps.length === 0 && task.plan && (task.plan as any).steps) {
      console.log(`[Orchestrator] Repopulating steps for task "${taskId}" from saved plan.`);
      const planSteps = (task.plan as any).steps || [];
      const stepIdMap = new Map<string, string>();
      for (const step of planSteps) {
        stepIdMap.set(step.id, `${taskId}_${step.id}`);
      }

      for (let i = 0; i < planSteps.length; i++) {
        const s = planSteps[i];
        const mappedId = stepIdMap.get(s.id) || `${taskId}_step_${i + 1}`;
        const mappedDeps = (s.depends_on || []).map((dep: string) => stepIdMap.get(dep) || dep);
        await repo.createTaskStep({
          id: mappedId,
          taskId,
          stepNumber: i + 1,
          name: s.name,
          tool: s.tool,
          action: s.action,
          status: 'pending',
          input: s.input,
          dependencies: mappedDeps,
          depends_on: mappedDeps,
          requires_approval: Boolean(s.requires_approval),
          risk_level: s.risk_level || 'low',
        });
      }
      initialSteps = await repo.getTaskSteps(taskId);
    }

    for (const step of initialSteps) {
      if (step.output) {
        stepOutputs.set(step.id, step.output);
        stepOutputs.set(step.name, step.output);
      }
    }

    // Main DAG Execution Loop
    let hasUnfinishedSteps = true;

    while (hasUnfinishedSteps) {
      // Check for cancellation
      if (this.cancelledTasks.has(taskId)) {
        console.log(`[Orchestrator] Task "${taskId}" was cancelled. Stopping pipeline.`);
        return (await repo.getTaskById(taskId, userId))!;
      }

      // Fetch fresh steps from repository
      const steps = await repo.getTaskSteps(taskId);
      const stepMap = new Map<string, TaskStep>();
      steps.forEach((s) => stepMap.set(s.id, s));

      // Find steps ready to execute
      const readySteps: TaskStep[] = [];

      for (const step of steps) {
        if (step.status !== 'pending' && step.status !== 'PENDING') {
          continue; // Already running, completed, or failed
        }

        const deps = step.dependencies || step.depends_on || [];
        let allDepsSatisfied = true;
        let anyDepFailed = false;

        for (const depId of deps) {
          const parent = stepMap.get(depId);
          if (!parent) {
            allDepsSatisfied = false;
            break;
          }

          // A dependent step starts ONLY when prerequisites are VERIFIED
          const isVerified =
            parent.verification_status === 'VERIFIED' ||
            parent.verificationStatus === 'VERIFIED' ||
            (parent.status === 'completed' && parent.output !== undefined);

          if (!isVerified) {
            allDepsSatisfied = false;
            if (parent.status === 'failed') {
              anyDepFailed = true;
            }
            break;
          }
        }

        if (anyDepFailed) {
          // Prerequisite failed, skip this step
          await repo.updateTaskStep(step.id, {
            taskId,
            status: 'skipped',
            error: 'Prerequisite step failed.',
          });
          continue;
        }

        if (allDepsSatisfied) {
          readySteps.push(step);
        }
      }

      // If no steps are ready, check if all finished or if we are blocked
      if (readySteps.length === 0) {
        const remainingPending = steps.filter((s) => s.status === 'pending' || s.status === 'running');
        if (remainingPending.length === 0) {
          hasUnfinishedSteps = false;
          break;
        } else {
          // Check if any step is currently running
          const currentlyRunning = steps.filter((s) => s.status === 'running');
          if (currentlyRunning.length === 0) {
            // Deadlock or missing prerequisites
            console.warn(`[Orchestrator] Task "${taskId}" has pending steps but none are ready to execute.`);
            hasUnfinishedSteps = false;
            break;
          }
          // Sleep briefly to await running steps
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
      }

      // Check if any ready step requires human approval
      for (const readyStep of readySteps) {
        const requiresApproval =
          readyStep.requires_approval ||
          readyStep.action === 'approval.request' ||
          readyStep.tool === 'approval' ||
          readyStep.action.includes('send') ||
          readyStep.action.includes('delete') ||
          readyStep.action.includes('share');

        if (requiresApproval && readyStep.action !== 'approval.request') {
          const payload = (readyStep.input || {}) as Record<string, unknown>;
          const approvalCheck = await approvalEngine.isStepApproved(taskId, readyStep.id, readyStep.action, payload, userId);

          if (!approvalCheck.approved) {
            // Need human approval!
            console.log(`[Orchestrator] Step "${readyStep.name}" (${readyStep.action}) requires human authorization.`);
            await approvalEngine.createApprovalRequest({
              taskId,
              stepId: readyStep.id,
              action: readyStep.action,
              payload,
              userId,
              title: `Authorize: ${readyStep.name}`,
              description: `Operator authorization required before executing ${readyStep.action}.`,
            });

            // Create notification for required approval
            await repo.createNotification({
              id: uuidv4(),
              userId,
              title: 'Approval Required',
              message: `Task "${task.title}" requires operator authorization for "${readyStep.name}".`,
              type: 'approval_required',
              read: false,
              link: '/approvals',
              createdAt: new Date().toISOString(),
            });

            // Halt execution and return task in AWAITING_APPROVAL status
            return (await repo.getTaskById(taskId, userId))!;
          }
        }
      }

      // Concurrency cap of 3 independent steps
      const batch = readySteps.slice(0, this.maxConcurrency);

      await Promise.all(
        batch.map(async (step) => {
          await this.executeStepWithRetry(step, taskId, userId, stepOutputs, task.mode);
        })
      );
    }

    // All steps processed. Determine final task status
    const finalSteps = await repo.getTaskSteps(taskId);
    const allVerified = finalSteps.length > 0 && finalSteps.every(
      (s) => (s.verification_status === 'VERIFIED' || s.verificationStatus === 'VERIFIED') && s.status === 'completed'
    );
    const anyVerified = finalSteps.some(
      (s) => s.verification_status === 'VERIFIED' || s.verificationStatus === 'VERIFIED'
    );
    const anyFailed = finalSteps.some(
      (s) => s.status === 'failed' || s.verification_status === 'FAILED' || s.verificationStatus === 'FAILED'
    );
    const anyInconclusive = finalSteps.some(
      (s) => s.verification_status === 'INCONCLUSIVE' || s.verificationStatus === 'INCONCLUSIVE'
    );

    // First transition to VERIFYING state
    await stateMachine.transition(taskId, 'VERIFYING', { userId });

    let finalState: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' = 'COMPLETED';
    if (allVerified) {
      finalState = 'COMPLETED';
    } else if (anyVerified && (anyFailed || anyInconclusive || !allVerified)) {
      finalState = 'PARTIALLY_COMPLETED';
    } else {
      finalState = 'FAILED';
    }

    // Calculate Trust Score (0-100) & Duration
    const recoveries = this.taskRecoveriesCount.get(taskId) || 0;
    const trustBreakdown = await TrustScoreCalculator.calculateTaskTrustScore(taskId, userId, recoveries);
    const finishTime = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.round((new Date(finishTime).getTime() - new Date(task.createdAt).getTime()) / 1000));

    await repo.updateTask(taskId, {
      trustScore: trustBreakdown.trustScore,
      trust_score: trustBreakdown.trustScore,
      durationSeconds,
      duration_seconds: durationSeconds,
    }, userId);

    // Emit Notification
    const notifType = finalState === 'COMPLETED' ? 'completed' : (finalState === 'PARTIALLY_COMPLETED' ? 'inconclusive' : 'failed');
    await repo.createNotification({
      id: uuidv4(),
      userId,
      title: finalState === 'COMPLETED' ? 'Task Completed' : (finalState === 'PARTIALLY_COMPLETED' ? 'Task Partially Completed' : 'Task Failed'),
      message: `Task "${task.title}" reached status ${finalState} (Trust Score: ${trustBreakdown.trustScore}/100).`,
      type: notifType,
      read: false,
      link: `/tasks/${taskId}`,
      createdAt: finishTime,
    });

    return stateMachine.transition(taskId, finalState, {
      userId,
      reason: `Pipeline finished with status ${finalState}. Trust Score: ${trustBreakdown.trustScore}/100.`,
    });
  }

  private async executeStepWithRetry(
    step: TaskStep,
    taskId: string,
    userId: string,
    stepOutputs: Map<string, unknown>,
    taskMode: 'demo' | 'live' = 'demo'
  ): Promise<void> {
    console.log(`[Orchestrator] Starting executeStepWithRetry for step "${step.name}" (${step.id}) action: ${step.action}`);
    const repo = getRepository();
    const connectorRegistry = ConnectorRegistry.getInstance();
    const toolName = (step.tool || step.action.split('.')[0] || 'store').toLowerCase();

    // Mark step running
    const now = new Date().toISOString();
    await repo.updateTaskStep(step.id, {
      taskId,
      status: 'running',
      startedAt: now,
      started_at: now,
    });

    const startEvent: ExecutionEvent = {
      id: uuidv4(),
      taskId,
      userId,
      stepId: step.id,
      type: 'step_start',
      message: `Executing step: ${step.name} (${step.action})`,
      payload: { stepId: step.id, action: step.action, tool: toolName },
      timestamp: now,
    };
    await repo.createExecutionEvent(startEvent);
    await SSEBroker.getInstance().broadcastEvent(startEvent);

    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | null = null;

    // Resolve dynamic inputs from dependency step outputs
    const resolvedInput: Record<string, unknown> = { ...(step.input || {}) };

    // Special handling for Data Extraction & DocumentEngine inputs
    if (step.action === 'reports.generate_summary' || step.action === 'document.generate_weekly_report') {
      const demoStore = DemoStore.getInstance();
      const extractedUpdates = await DataExtractor.extractProjectUpdatesFromEmails(demoStore.emails);
      resolvedInput.projectUpdates = extractedUpdates;
    }

    // Special handling for approval.request action: auto-resolve as approved prerequisite
    if (step.action === 'approval.request' || toolName === 'approval') {
      const finishTime = new Date().toISOString();
      await repo.updateTaskStep(step.id, {
        taskId,
        status: 'completed',
        verification_status: 'VERIFIED',
        verificationStatus: 'VERIFIED',
        completedAt: finishTime,
        completed_at: finishTime,
        output: { approval_granted: true, authorized: true },
      });
      stepOutputs.set(step.id, { approval_granted: true });

      await VerificationEngine.getInstance().verifyStep(
        step,
        { success: true, data: { approval_granted: true } },
        { taskId, userId, mode: taskMode }
      );
      return;
    }

    const chaosEngine = ChaosEngine.getInstance();
    const recoveryEngine = RecoveryEngine.getInstance();

    while (attempt < maxRetries) {
      try {
        // 1. CHAOS MODE INTERCEPTION (Demo mode only)
        await chaosEngine.maybeTriggerFault(step, userId, taskMode);

        const connector = connectorRegistry.getConnector(toolName);
        if (!connector) {
          throw new Error(`Tool connector "${toolName}" is not registered.`);
        }

        // Per-step 30s timeout with automatic cleanup
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Step execution timeout after 30s.')), 30000);
        });

        const executionPromise = connector.execute(step.action, resolvedInput, {
          taskId,
          stepId: step.id,
          userId,
          mode: taskMode,
        });

        let result: any;
        try {
          result = await Promise.race([executionPromise, timeoutPromise]);
        } finally {
          if (timer) clearTimeout(timer);
        }

        // 2. INDEPENDENT VERIFICATION ENGINE
        const evidence = await VerificationEngine.getInstance().verifyStep(step, result, {
          taskId,
          userId,
          mode: taskMode,
        });

        if (evidence.status !== 'VERIFIED') {
          throw new Error(`Step verification failed: ${evidence.evidenceSummary}`);
        }

        const finishTime = new Date().toISOString();

        // 3. Update step state in repository
        await repo.updateTaskStep(step.id, {
          taskId,
          status: 'completed',
          output: result.data as Record<string, unknown>,
          outputRef: result.outputRef,
          output_ref: result.outputRef,
          verificationStatus: 'VERIFIED',
          verification_status: 'VERIFIED',
          completedAt: finishTime,
          completed_at: finishTime,
          retryCount: attempt,
          retry_count: attempt,
        });

        stepOutputs.set(step.id, result.data);
        stepOutputs.set(step.name, result.data);

        // 4. Broadcast step_finish event
        const finishEvent: ExecutionEvent = {
          id: uuidv4(),
          taskId,
          userId,
          stepId: step.id,
          type: 'step_finish',
          message: `Step completed: ${step.name}`,
          payload: {
            stepId: step.id,
            action: step.action,
            output: result.data,
            mode: result.mode,
          },
          timestamp: finishTime,
        };
        await repo.createExecutionEvent(finishEvent);
        await SSEBroker.getInstance().broadcastEvent(finishEvent);

        return; // Success!
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempt++;
        this.taskRecoveriesCount.set(taskId, (this.taskRecoveriesCount.get(taskId) || 0) + 1);

        console.warn(`[Orchestrator] Step "${step.id}" failed attempt ${attempt}/${maxRetries}:`, lastError.message);

        // RECOVERY ENGINE ENGAGEMENT
        const category = recoveryEngine.classifyError(lastError);
        const plan = recoveryEngine.determineRecoveryPlan(step, category, attempt);
        await recoveryEngine.logRecoveryAttempt(taskId, userId, step, attempt, plan);

        // Check-before-retry strategy for uncertain outcomes (emails, uploads)
        if (plan.strategy === 'check_before_retry') {
          const preCheck = await recoveryEngine.checkPreExistingSuccess(step, { taskId, mode: taskMode });
          if (preCheck.alreadySucceeded && preCheck.result) {
            console.log(`[Orchestrator] Recovered via check-before-retry on "${step.name}".`);
            const evidence = await VerificationEngine.getInstance().verifyStep(step, preCheck.result, {
              taskId,
              userId,
              mode: taskMode,
            });

            if (evidence.status === 'VERIFIED') {
              const finishTime = new Date().toISOString();
              await repo.updateTaskStep(step.id, {
                taskId,
                status: 'completed',
                output: preCheck.result.data as Record<string, unknown>,
                outputRef: preCheck.result.outputRef,
                output_ref: preCheck.result.outputRef,
                verificationStatus: 'VERIFIED',
                verification_status: 'VERIFIED',
                completedAt: finishTime,
                completed_at: finishTime,
                retryCount: attempt,
                retry_count: attempt,
              });

              stepOutputs.set(step.id, preCheck.result.data);
              stepOutputs.set(step.name, preCheck.result.data);

              try {
                await TaskStateMachine.getInstance().transition(taskId, 'RUNNING', {
                  userId,
                  reason: `Task resumed after check-before-retry recovery for "${step.name}".`,
                });
              } catch (_) {}

              return; // Recovered without duplicate send!
            }
          }
        }

        if (attempt < maxRetries && plan.canAutoRecover) {
          if (plan.delayMs) {
            await new Promise((r) => setTimeout(r, plan.delayMs));
          }
          // Resume state machine back to RUNNING for retry
          try {
            await TaskStateMachine.getInstance().transition(taskId, 'RUNNING', {
              userId,
              reason: `Resuming execution after recovery backoff for "${step.name}".`,
            });
          } catch (_) {}
        } else {
          break; // Max retries exceeded or non-recoverable
        }
      }
    }

    // Step failed after retries & recovery
    const failTime = new Date().toISOString();
    await repo.updateTaskStep(step.id, {
      taskId,
      status: 'failed',
      error: lastError?.message || 'Execution failed after retries and recovery.',
      verificationStatus: 'FAILED',
      verification_status: 'FAILED',
      completedAt: failTime,
      completed_at: failTime,
      retryCount: attempt,
      retry_count: attempt,
    });

    const errorEvent: ExecutionEvent = {
      id: uuidv4(),
      taskId,
      userId,
      stepId: step.id,
      type: 'error',
      message: `Step failed: ${step.name} - ${lastError?.message}`,
      payload: { stepId: step.id, error: lastError?.message, attempts: attempt },
      timestamp: failTime,
    };
    await repo.createExecutionEvent(errorEvent);
    await SSEBroker.getInstance().broadcastEvent(errorEvent);
  }

  // Resume interrupted tasks safely after server restart
  public async resumeInterruptedTasks(): Promise<number> {
    const repo = getRepository();
    // Query active demo user tasks
    const tasks = await repo.getTasks('system');
    const interrupted = tasks.filter((t) => t.status === 'RUNNING' || t.status === 'QUEUED');

    for (const t of interrupted) {
      console.log(`[Orchestrator] Resuming interrupted task "${t.id}" (${t.title})...`);
      this.runTask(t.id, t.userId).catch((err) => {
        console.error(`[Orchestrator] Failed to resume task "${t.id}":`, err);
      });
    }

    return interrupted.length;
  }
}
