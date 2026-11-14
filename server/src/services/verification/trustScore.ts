import { getRepository } from '../../repository';
import { ProofLedger } from './proofLedger';

export interface TrustScoreBreakdown {
  taskId: string;
  trustScore: number;
  verifiedRatio: number;
  totalSteps: number;
  verifiedSteps: number;
  failedSteps: number;
  inconclusiveSteps: number;
  retriesCount: number;
  recoveriesCount: number;
  approvalsCount: number;
  chainValid: boolean;
  penalties: {
    retriesPenalty: number;
    recoveriesPenalty: number;
    inconclusivePenalty: number;
  };
  bonuses: {
    approvalsBonus: number;
  };
  explanation: string;
}

export class TrustScoreCalculator {
  /**
   * Computes the mathematical Trust Score (0-100) for a task execution.
   */
  public static async calculateTaskTrustScore(
    taskId: string,
    userId: string,
    recoveriesCount = 0
  ): Promise<TrustScoreBreakdown> {
    const repo = getRepository();
    const steps = await repo.getTaskSteps(taskId);
    const approvals = await repo.getApprovals(userId);
    const taskApprovals = approvals.filter((a) => a.taskId === taskId && a.status === 'approved');
    const ledgerCheck = await ProofLedger.getInstance().verifyChain(taskId);

    const totalSteps = steps.length || 1;
    const verifiedSteps = steps.filter(
      (s) => s.verification_status === 'VERIFIED' || s.verificationStatus === 'VERIFIED'
    ).length;
    const failedSteps = steps.filter(
      (s) => s.verification_status === 'FAILED' || s.verificationStatus === 'FAILED' || s.status === 'failed'
    ).length;
    const inconclusiveSteps = steps.filter(
      (s) => s.verification_status === 'INCONCLUSIVE' || s.verificationStatus === 'INCONCLUSIVE'
    ).length;

    const retriesCount = steps.reduce(
      (sum, s) => sum + (s.retryCount || s.retry_count || 0),
      0
    );
    const approvalsCount = taskApprovals.length;

    // Formula Components:
    // Base: Verified Ratio (0 - 100)
    const verifiedRatio = Math.round((verifiedSteps / totalSteps) * 100);

    // Penalties:
    // 5 pts per retry
    const retriesPenalty = retriesCount * 5;
    // 10 pts per recovery
    const recoveriesPenalty = recoveriesCount * 10;
    // 15 pts per inconclusive check
    const inconclusivePenalty = inconclusiveSteps * 15;

    // Bonuses:
    // +5 pts per operator-approved checkpoint
    const approvalsBonus = approvalsCount * 5;

    let score = verifiedRatio - retriesPenalty - recoveriesPenalty - inconclusivePenalty + approvalsBonus;

    // Boundary conditions:
    // 1. If proof ledger chain is broken/tampered, trust is completely compromised: score = 0
    if (!ledgerCheck.valid) {
      score = 0;
    }

    // 2. If any step failed, score cannot exceed 40
    if (failedSteps > 0 && score > 40) {
      score = 40;
    }

    // 3. Clamp between 0 and 100
    const trustScore = Math.max(0, Math.min(100, Math.round(score)));

    const explanation = !ledgerCheck.valid
      ? 'Trust score zeroed: Proof ledger cryptographic chain tampering detected.'
      : `Verified ${verifiedSteps}/${totalSteps} steps (${verifiedRatio}%). Retries penalty: -${retriesPenalty}, recoveries: -${recoveriesPenalty}, inconclusive: -${inconclusivePenalty}, approvals bonus: +${approvalsBonus}.`;

    return {
      taskId,
      trustScore,
      verifiedRatio,
      totalSteps,
      verifiedSteps,
      failedSteps,
      inconclusiveSteps,
      retriesCount,
      recoveriesCount,
      approvalsCount,
      chainValid: ledgerCheck.valid,
      penalties: {
        retriesPenalty,
        recoveriesPenalty,
        inconclusivePenalty,
      },
      bonuses: {
        approvalsBonus,
      },
      explanation,
    };
  }
}
