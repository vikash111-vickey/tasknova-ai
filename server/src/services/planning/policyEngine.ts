import { ExecutionStep, RiskLevel } from './schemas';
import { getRepository } from '../../repository';

export class PolicyEngine {
  async applyPolicies(userId: string, steps: ExecutionStep[]): Promise<ExecutionStep[]> {
    const repo = getRepository();
    const userPolicies = await repo.getPolicies(userId);

    return steps.map((step) => {
      let requiresApproval = step.requires_approval;
      let riskLevel: RiskLevel = step.risk_level;

      // Default baseline policy: external send / email always requires approval
      if (step.action === 'email.send' || step.action.includes('delete')) {
        requiresApproval = true;
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // User-configured policies
      for (const policy of userPolicies) {
        if (!policy.isActive) continue;

        if (policy.ruleType === 'require_approval') {
          const targetAction = policy.ruleConfig?.action as string | undefined;
          const threshold = policy.ruleConfig?.threshold as number | undefined;
          if (targetAction && (step.action === targetAction || step.tool === targetAction)) {
            requiresApproval = true;
          } else if (threshold && (step.estimated_seconds || 0) >= threshold) {
            requiresApproval = true;
          }
        }

        if (policy.ruleType === 'allowed_connectors') {
          const allowed = (policy.ruleConfig.allowedTools as string[]) || [];
          if (allowed.length > 0 && !allowed.includes(step.tool)) {
            riskLevel = 'high';
            requiresApproval = true;
          }
        }
      }

      return {
        ...step,
        requires_approval: requiresApproval,
        risk_level: riskLevel,
      };
    });
  }
}
