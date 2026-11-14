import cron, { ScheduledTask } from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { Schedule, Task, TaskStep, ExecutionEvent } from '../../types/models';
import { getRepository } from '../../repository';
import { PlanningPipeline } from '../planning/pipeline';
import { Orchestrator } from '../execution/orchestrator';
import { SSEBroker } from '../../sse/broker';

export class SchedulerService {
  private static instance: SchedulerService;
  private scheduledJobs = new Map<string, ScheduledTask>();
  private pipeline = new PlanningPipeline();

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  public async init(): Promise<void> {
    try {
      const repo = getRepository();
      const activeSchedules = await repo.getAllActiveSchedules();
      console.log(`[SchedulerService] Initializing with ${activeSchedules.length} active schedule(s)...`);

      for (const schedule of activeSchedules) {
        this.registerCronJob(schedule);
      }
    } catch (err) {
      console.error('[SchedulerService] Failed to initialize schedules:', err);
    }
  }

  public registerCronJob(schedule: Schedule): boolean {
    // If existing job is running, stop it first
    this.unregisterCronJob(schedule.id);

    if (!schedule.isActive) {
      return false;
    }

    if (!cron.validate(schedule.cronExpression)) {
      console.warn(`[SchedulerService] Invalid cron expression: "${schedule.cronExpression}" for schedule ${schedule.id}`);
      return false;
    }

    try {
      const job = cron.schedule(
        schedule.cronExpression,
        async () => {
          console.log(`[SchedulerService] Cron triggered for schedule "${schedule.name || schedule.id}"`);
          await this.executeSchedule(schedule);
        },
        {
          timezone: schedule.timezone || 'UTC',
        }
      );

      this.scheduledJobs.set(schedule.id, job);
      console.log(`[SchedulerService] Registered cron job for schedule "${schedule.name || schedule.id}" (${schedule.cronExpression})`);
      return true;
    } catch (err) {
      console.error(`[SchedulerService] Error scheduling job for ${schedule.id}:`, err);
      return false;
    }
  }

  public unregisterCronJob(scheduleId: string): void {
    const job = this.scheduledJobs.get(scheduleId);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(scheduleId);
      console.log(`[SchedulerService] Unregistered cron job for schedule ${scheduleId}`);
    }
  }

  public async runNow(schedule: Schedule): Promise<Task> {
    console.log(`[SchedulerService] Manual runNow invoked for schedule "${schedule.name || schedule.id}"`);
    return this.executeSchedule(schedule);
  }

  public async executeSchedule(schedule: Schedule): Promise<Task> {
    const repo = getRepository();
    const now = new Date().toISOString();

    // 1. Update schedule lastRunAt
    await repo.updateSchedule(schedule.id, { lastRunAt: now }, schedule.userId);

    const instruction =
      schedule.instruction || 'Perform scheduled periodic task verification and workflow execution.';

    // 2. Generate plan using planning pipeline
    const planResult = await this.pipeline.generate(instruction, schedule.userId);
    const plan = planResult.plan;

    // 3. Create task
    const newTask: Task = {
      id: uuidv4(),
      userId: schedule.userId,
      title: schedule.name ? `[Scheduled] ${schedule.name}` : plan.title,
      instructions: instruction,
      status: 'AWAITING_APPROVAL',
      mode: 'demo',
      priority: plan.risk_level === 'high' ? 'high' : 'normal',
      plan: plan as unknown as Record<string, unknown>,
      createdAt: now,
      updatedAt: now,
    };

    const createdTask = await repo.createTask(newTask);

    // 4. Create task steps
    const stepIdMap = new Map<string, string>();
    for (const step of plan.steps) {
      stepIdMap.set(step.id, `${createdTask.id}_${step.id}`);
    }

    let hasApprovalRequired = false;
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const mappedId = stepIdMap.get(step.id) || `${createdTask.id}_step_${i + 1}`;
      const mappedDeps = (step.depends_on || []).map((dep) => stepIdMap.get(dep) || dep);

      if (step.requires_approval) {
        hasApprovalRequired = true;
      }

      const newStep: TaskStep = {
        id: mappedId,
        taskId: createdTask.id,
        stepNumber: i + 1,
        name: step.name,
        tool: step.tool,
        action: step.action,
        status: 'pending',
        input: step.input,
        dependencies: mappedDeps,
        depends_on: mappedDeps,
        requires_approval: Boolean(step.requires_approval),
        risk_level: step.risk_level || 'low',
      };
      await repo.createTaskStep(newStep);
    }

    // 5. Emit schedule trigger event
    const event: ExecutionEvent = {
      id: uuidv4(),
      taskId: createdTask.id,
      userId: schedule.userId,
      type: 'status_change',
      message: `Scheduled run triggered by scheduler for "${schedule.name || 'Recurring Task'}".`,
      payload: {
        scheduleId: schedule.id,
        cronExpression: schedule.cronExpression,
        requiresApproval: hasApprovalRequired,
      },
      timestamp: now,
    };
    await repo.createExecutionEvent(event);
    await SSEBroker.getInstance().broadcastEvent(event);

    // 6. Notify operator
    if (hasApprovalRequired) {
      await repo.createNotification({
        id: uuidv4(),
        userId: schedule.userId,
        title: `Scheduled Task Awaiting Approval (DEMO)`,
        message: `Task "${createdTask.title}" has steps requiring human approval before execution.`,
        type: 'approval_required',
        read: false,
        link: `/tasks/${createdTask.id}/execute`,
        createdAt: now,
      });
      return createdTask;
    } else {
      // Auto-run if no approval required
      await repo.updateTask(createdTask.id, { status: 'pending' }, schedule.userId);
      // Run orchestrator asynchronously
      Orchestrator.getInstance()
        .runTask(createdTask.id, schedule.userId)
        .then(async (completedTask) => {
          await repo.createNotification({
            id: uuidv4(),
            userId: schedule.userId,
            title: `Scheduled Task Completed (DEMO)`,
            message: `Task "${completedTask.title}" executed and verified successfully.`,
            type: 'completed',
            read: false,
            link: `/tasks/${completedTask.id}/execute`,
            createdAt: new Date().toISOString(),
          });
        })
        .catch(async (err) => {
          console.error(`[SchedulerService] Scheduled execution failed for ${createdTask.id}:`, err);
          await repo.createNotification({
            id: uuidv4(),
            userId: schedule.userId,
            title: `Scheduled Task Failed`,
            message: `Task "${createdTask.title}" failed: ${err.message}`,
            type: 'failed',
            read: false,
            link: `/tasks/${createdTask.id}/execute`,
            createdAt: new Date().toISOString(),
          });
        });

      return createdTask;
    }
  }
}
