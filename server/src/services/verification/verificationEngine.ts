import { v4 as uuidv4 } from 'uuid';
import { TaskStep, EvidenceRecord, VerificationStatus, ExecutionEvent } from '../../types/models';
import { ConnectorRegistry } from '../../connectors';
import { ProofLedger } from './proofLedger';
import { getRepository } from '../../repository';
import { SSEBroker } from '../../sse/broker';

export interface VerificationContext {
  taskId: string;
  userId: string;
  mode: 'demo' | 'live';
}

export class VerificationEngine {
  private static instance: VerificationEngine;

  private constructor() {}

  public static getInstance(): VerificationEngine {
    if (!VerificationEngine.instance) {
      VerificationEngine.instance = new VerificationEngine();
    }
    return VerificationEngine.instance;
  }

  /**
   * Conducts an independent verification of a step's execution result.
   * Re-reads live or demo state through the registered connector.
   * Never marks VERIFIED without concrete confirmed state check.
   */
  public async verifyStep(
    step: TaskStep,
    executionResult: any,
    context: VerificationContext
  ): Promise<EvidenceRecord> {
    const repo = getRepository();
    const toolName = (step.tool || step.action.split('.')[0] || 'store').toLowerCase();
    const connector = ConnectorRegistry.getInstance().getConnector(toolName);
    const now = new Date().toISOString();

    // 1. Initial CHECKING state
    let status: VerificationStatus = 'CHECKING';
    let summary = 'Verification check initiated.';
    let providerRefId: string | undefined =
      executionResult?.outputRef ||
      executionResult?.data?.id ||
      executionResult?.data?.fileId ||
      executionResult?.data?.outboxId ||
      executionResult?.data?.eventId;

    const sanitizedDetails: Record<string, unknown> = {};

    if (!connector) {
      status = 'FAILED';
      summary = `Connector "${toolName}" is not registered. Cannot conduct verification.`;
    } else if (!executionResult) {
      status = 'INCONCLUSIVE';
      summary = 'Execution result is missing. Verification inconclusive.';
    } else {
      try {
        // Re-read state through connector.verify()
        const expectedOutput = step.name || step.action;
        const verifyResult = await connector.verify(step.action, executionResult, expectedOutput);

        if (verifyResult.verified) {
          status = 'VERIFIED';
          summary = verifyResult.message || `Confirmed: Step "${step.name}" verified against provider state.`;

          if (verifyResult.evidence) {
            // Sanitize evidence (strip auth headers, passwords, keys)
            const ev = typeof verifyResult.evidence === 'object' ? { ...verifyResult.evidence } : { evidence: verifyResult.evidence };
            delete (ev as any).token;
            delete (ev as any).password;
            delete (ev as any).secret;
            delete (ev as any).authorization;
            Object.assign(sanitizedDetails, ev);

            if ((ev as any).fileId) providerRefId = (ev as any).fileId;
            if ((ev as any).outboxId) providerRefId = (ev as any).outboxId;
            if ((ev as any).eventId) providerRefId = (ev as any).eventId;
          }

          // Strict rule: Email verification claims only 'accepted by provider'
          if (step.action.includes('send') && step.action.includes('email')) {
            summary = 'Confirmed: Accepted by provider mail server (delivery/reading not claimed).';
          }
        } else {
          if (verifyResult.message?.toLowerCase().includes('inconclusive')) {
            status = 'INCONCLUSIVE';
            summary = verifyResult.message || 'Verification could not conclusively confirm outcome.';
          } else {
            status = 'FAILED';
            summary = verifyResult.message || 'Evidence check failed or state mismatch detected.';
          }
        }
      } catch (err: unknown) {
        status = 'FAILED';
        summary = `Verification exception: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // 2. Create sanitized EvidenceRecord
    const evidence: EvidenceRecord = {
      id: uuidv4(),
      operationId: step.id,
      taskId: context.taskId,
      userId: context.userId,
      tool: toolName,
      method: step.action,
      timestamp: now,
      providerReferenceId: providerRefId,
      evidenceSummary: summary,
      status,
      mode: context.mode,
      details: sanitizedDetails,
    };

    // 3. Persist EvidenceRecord in repository
    await repo.createEvidenceRecord(evidence);

    // 4. Record into cryptographic Proof Ledger
    await ProofLedger.getInstance().appendEvidence(context.taskId, context.userId, evidence);

    // 5. Update step verification_status in repository
    await repo.updateTaskStep(step.id, {
      taskId: context.taskId,
      verificationStatus: status,
      verification_status: status,
    });

    // 6. Broadcast verification event over SSE
    const verifyEvent: ExecutionEvent = {
      id: uuidv4(),
      taskId: context.taskId,
      userId: context.userId,
      stepId: step.id,
      type: 'verification',
      message: `Step verification [${status}]: ${summary}`,
      payload: {
        stepId: step.id,
        status,
        summary,
        providerReferenceId: providerRefId,
      },
      timestamp: now,
    };
    await repo.createExecutionEvent(verifyEvent);
    await SSEBroker.getInstance().broadcastEvent(verifyEvent);

    return evidence;
  }
}
