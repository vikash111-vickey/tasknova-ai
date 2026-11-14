import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Approval } from '../../types/models';
import { getRepository } from '../../repository';
import { TaskStateMachine } from './stateMachine';
import { SSEBroker } from '../../sse/broker';

export class ApprovalEngine {
  private static instance: ApprovalEngine;

  public static getInstance(): ApprovalEngine {
    if (!ApprovalEngine.instance) {
      ApprovalEngine.instance = new ApprovalEngine();
    }
    return ApprovalEngine.instance;
  }

  public computePayloadHash(action: string, payload: Record<string, unknown>): string {
    // Sort keys for deterministic normalization
    const sortedKeys = Object.keys(payload || {}).sort();
    const normalized: Record<string, unknown> = {};
    for (const k of sortedKeys) {
      normalized[k] = payload[k];
    }
    const serialized = JSON.stringify({ action, normalized });
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  public async createApprovalRequest(params: {
    taskId: string;
    stepId: string;
    action: string;
    payload: Record<string, unknown>;
    userId: string;
    title?: string;
    description?: string;
    expiryMinutes?: number;
  }): Promise<Approval> {
    const repo = getRepository();
    const expiryMinutes = params.expiryMinutes || 15;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000).toISOString();
    const payloadHash = this.computePayloadHash(params.action, params.payload);

    const approval: Approval = {
      id: uuidv4(),
      taskId: params.taskId,
      userId: params.userId,
      title: params.title || `Authorize ${params.action}`,
      description:
        params.description ||
        `Security verification required before dispatching "${params.action}".`,
      actionRequired: params.action,
      status: 'pending',
      payload: params.payload,
      payloadHash,
      stepId: params.stepId,
      expiresAt,
      createdAt: now.toISOString(),
    };

    const created = await repo.createApproval(approval);

    // Transition task to AWAITING_APPROVAL
    await TaskStateMachine.getInstance().transition(params.taskId, 'AWAITING_APPROVAL', {
      reason: `Task waiting for human authorization on step "${params.stepId}" (${params.action}).`,
      stepId: params.stepId,
      payload: { approvalId: created.id, action: params.action, expiresAt },
      userId: params.userId,
    });

    return created;
  }

  public async approve(approvalId: string, userId: string, note?: string): Promise<Approval> {
    const repo = getRepository();
    const approval = await repo.getApprovalById(approvalId);

    if (!approval) {
      throw new Error(`Approval request "${approvalId}" not found.`);
    }

    if (approval.userId !== userId) {
      throw new Error('Unauthorized to approve this request.');
    }

    // Check expiry
    if (approval.expiresAt && new Date() > new Date(approval.expiresAt)) {
      await repo.updateApproval(approvalId, { status: 'expired' });
      throw new Error('Approval request has expired and cannot be authorized.');
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval is not in pending state (currently "${approval.status}").`);
    }

    const now = new Date().toISOString();
    const updated = await repo.updateApproval(approvalId, {
      status: 'approved',
      decisionNote: note || 'Authorized by human operator.',
      decidedAt: now,
    });

    if (!updated) {
      throw new Error(`Failed to update approval "${approvalId}".`);
    }

    // Broadcast approval event
    await SSEBroker.getInstance().broadcastEvent({
      id: uuidv4(),
      taskId: approval.taskId,
      userId,
      stepId: approval.stepId,
      type: 'approval_required',
      message: `Approval granted for ${approval.actionRequired}.`,
      payload: { approvalId, status: 'approved' },
      timestamp: now,
    });

    return updated;
  }

  public async reject(approvalId: string, userId: string, note?: string): Promise<Approval> {
    const repo = getRepository();
    const approval = await repo.getApprovalById(approvalId);

    if (!approval) {
      throw new Error(`Approval request "${approvalId}" not found.`);
    }

    if (approval.userId !== userId) {
      throw new Error('Unauthorized to reject this request.');
    }

    const now = new Date().toISOString();
    const updated = await repo.updateApproval(approvalId, {
      status: 'rejected',
      decisionNote: note || 'Rejected by human operator.',
      decidedAt: now,
    });

    if (!updated) {
      throw new Error(`Failed to update approval "${approvalId}".`);
    }

    // Task transitions to CANCELLED or FAILED
    await TaskStateMachine.getInstance().transition(approval.taskId, 'CANCELLED', {
      reason: `Task cancelled due to operator rejection on ${approval.actionRequired}: ${note || 'No reason provided.'}`,
      stepId: approval.stepId,
      payload: { approvalId, status: 'rejected' },
      userId,
    });

    return updated;
  }

  public async editPayload(
    approvalId: string,
    userId: string,
    newPayload: Record<string, unknown>
  ): Promise<Approval> {
    const repo = getRepository();
    const approval = await repo.getApprovalById(approvalId);

    if (!approval) {
      throw new Error(`Approval request "${approvalId}" not found.`);
    }

    if (approval.userId !== userId) {
      throw new Error('Unauthorized to edit this request.');
    }

    const newHash = this.computePayloadHash(approval.actionRequired, newPayload);

    // If payload has been edited, bound approval is invalidated and reset to pending with new expiry
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 15 * 60000).toISOString();

    const updated = await repo.updateApproval(approvalId, {
      payload: newPayload,
      payloadHash: newHash,
      status: 'pending', // Re-requires approval!
      decisionNote: 'Payload edited by operator. Previous approval invalidated.',
      expiresAt: newExpiresAt,
      decidedAt: undefined,
    });

    if (!updated) {
      throw new Error(`Failed to update edited approval "${approvalId}".`);
    }

    // Update bound task step input if exists
    if (approval.stepId) {
      await repo.updateTaskStep(approval.stepId, {
        input: newPayload,
      });
    }

    await SSEBroker.getInstance().broadcastEvent({
      id: uuidv4(),
      taskId: approval.taskId,
      userId,
      stepId: approval.stepId,
      type: 'log',
      message: `Approval payload edited. Old approval invalidated, new approval required.`,
      payload: { approvalId, newHash },
      timestamp: now.toISOString(),
    });

    return updated;
  }

  public async isStepApproved(
    taskId: string,
    stepId: string,
    action: string,
    currentPayload: Record<string, unknown>,
    userId?: string
  ): Promise<{ approved: boolean; error?: string; approval?: Approval }> {
    const repo = getRepository();
    const approvals = await repo.getApprovals(userId || 'system');
    const taskApprovals = approvals.filter((a) => a.taskId === taskId && a.stepId === stepId);

    if (taskApprovals.length === 0) {
      return { approved: false, error: 'No approval record found for step.' };
    }

    // Find the latest approval
    const latest = taskApprovals[taskApprovals.length - 1];

    if (latest.status === 'expired' || (latest.expiresAt && new Date() > new Date(latest.expiresAt))) {
      return { approved: false, error: 'Approval has expired. A fresh approval is required.', approval: latest };
    }

    if (latest.status !== 'approved') {
      return { approved: false, error: `Step is awaiting operator authorization (status: ${latest.status}).`, approval: latest };
    }

    // Verify cryptographic binding to exact payload
    const expectedHash = this.computePayloadHash(action, currentPayload);
    if (latest.payloadHash !== expectedHash) {
      return {
        approved: false,
        error: 'Approval payload mismatch! Action parameters were modified after approval.',
        approval: latest,
      };
    }

    return { approved: true, approval: latest };
  }
}
