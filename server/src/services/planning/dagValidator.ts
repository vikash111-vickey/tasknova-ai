import { ExecutionPlan, ExecutionStep } from './schemas';
import { ToolRegistry } from './toolRegistry';

export interface DAGValidationResult {
  isValid: boolean;
  errors: string[];
  repairedPlan?: ExecutionPlan;
}

export class DAGValidator {
  private registry: ToolRegistry;

  constructor() {
    this.registry = ToolRegistry.getInstance();
  }

  public static validateAndEnforce(plan: ExecutionPlan): ExecutionPlan {
    const validator = new DAGValidator();
    const result = validator.validateAndEnforce(plan);
    if (!result.isValid) {
      throw new Error(`DAG Validation Failed: ${result.errors.join('; ')}`);
    }
    return result.repairedPlan || plan;
  }

  public validateAndEnforce(plan: ExecutionPlan): DAGValidationResult {
    const errors: string[] = [];
    const stepMap = new Map<string, ExecutionStep>();
    const steps = [...plan.steps];

    // 1. Check duplicate step IDs & unknown tools/actions
    for (const step of steps) {
      if (stepMap.has(step.id)) {
        errors.push(`Duplicate step ID detected: "${step.id}"`);
      }
      stepMap.set(step.id, step);

      const toolDef = this.registry.getTool(step.tool);
      if (!toolDef) {
        errors.push(`Unknown tool "${step.tool}" in step "${step.id}". Tool is not registered.`);
      }

      const actionDef = this.registry.getAction(step.action);
      if (!actionDef) {
        errors.push(`Unknown action "${step.action}" in step "${step.id}". Action is not registered.`);
      } else if (actionDef.tool !== step.tool) {
        errors.push(`Action "${step.action}" belongs to tool "${actionDef.tool}", but step declared "${step.tool}".`);
      }
    }

    // 2. Check missing dependencies
    for (const step of steps) {
      for (const depId of step.depends_on) {
        if (!stepMap.has(depId)) {
          errors.push(`Step "${step.id}" depends on non-existent step "${depId}".`);
        }
      }
    }

    // 3. Cycle Detection using DFS
    if (this.hasCycle(steps)) {
      errors.push('Cyclic dependency detected in execution graph. Steps must form a Directed Acyclic Graph (DAG).');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // 4. Enforce Security & Approval Policies:
    // "approval step inserted before any external send, calendar write involving others, delete, or share."
    const repairedSteps: ExecutionStep[] = [];
    let insertedApprovals = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const actionDef = this.registry.getAction(step.action);

      const isExternalSendOrDelete =
        actionDef?.requiresDefaultApproval ||
        step.action.includes('send') ||
        step.action.includes('delete') ||
        step.action.includes('share') ||
        step.action.includes('calendar_write');

      if (isExternalSendOrDelete) {
        // Check if an immediate or ancestor dependency is an approval.request step
        const hasApprovalPredecessor = step.depends_on.some((depId) => {
          const depStep = stepMap.get(depId);
          return depStep?.action === 'approval.request';
        });

        if (!hasApprovalPredecessor) {
          // Auto-insert approval step right before this step
          insertedApprovals = true;
          const approvalStepId = `approval_before_${step.id}`;

          const approvalStep: ExecutionStep = {
            id: approvalStepId,
            name: `Approve: ${step.name}`,
            tool: 'approval',
            action: 'approval.request',
            input: {
              target: step.action,
              targetStepId: step.id,
              description: `Operator authorization required before executing ${step.action}`,
            },
            depends_on: [...step.depends_on],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Operator authorization confirmation',
            verification_method: 'operator_authorization',
            reason: 'Security policy: human confirmation required before external dispatch or modification',
            estimated_seconds: 5,
            idempotent: false,
          };

          repairedSteps.push(approvalStep);
          stepMap.set(approvalStepId, approvalStep);

          // Update current step to depend on this approval
          step.depends_on = [approvalStepId];
          step.requires_approval = true;
        }
      }

      repairedSteps.push(step);
    }

    const totalSeconds = repairedSteps.reduce((sum, s) => sum + (s.estimated_seconds || 10), 0);

    const finalPlan: ExecutionPlan = {
      ...plan,
      steps: repairedSteps,
      estimated_total_seconds: totalSeconds,
    };

    return {
      isValid: true,
      errors: [],
      repairedPlan: insertedApprovals ? finalPlan : plan,
    };
  }

  private hasCycle(steps: ExecutionStep[]): boolean {
    const adj = new Map<string, string[]>();
    for (const step of steps) {
      adj.set(step.id, step.depends_on || []);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (dfs(step.id)) return true;
      }
    }

    return false;
  }
}
