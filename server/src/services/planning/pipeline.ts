import { getAIProvider, TemplatePlanner } from '../ai';
import { AIProvider } from '../ai/types';
import {
  IntentAnalysis,
  IntentAnalysisSchema,
  ExecutionPlan,
  ExecutionPlanSchema,
} from './schemas';
import { DAGValidator } from './dagValidator';
import { PolicyEngine } from './policyEngine';
import { ToolRegistry } from './toolRegistry';

export interface PlanGenerationResult {
  plan: ExecutionPlan;
  planner_used: string;
  fallback_used: boolean;
  intent: IntentAnalysis;
  warnings?: string[];
}

export class PlanningPipeline {
  private dagValidator = new DAGValidator();
  private policyEngine = new PolicyEngine();
  private primaryProvider?: AIProvider;
  private fallbackProvider: TemplatePlanner;

  constructor(primaryProvider?: AIProvider, fallbackProvider?: TemplatePlanner) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider || new TemplatePlanner();
  }

  private getProvider(): AIProvider {
    return this.primaryProvider || getAIProvider();
  }

  async understand(instruction: string): Promise<IntentAnalysis> {
    const ai = this.getProvider();

    const systemPrompt = `You are an expert AI intent analyzer for TASKNOVA.
Analyze the user instruction and identify objective, target tools, required data, missing information, and clarifying questions.
Never invent data. If essential parameters (such as recipient, target source, or critical criteria) are missing, populate clarifying_questions and set can_proceed to false.
Return strictly valid JSON conforming to the schema.`;

    const prompt = `IntentAnalysis for Instruction: "${instruction}"`;

    try {
      const res = await ai.generateStructured(prompt, IntentAnalysisSchema, systemPrompt);
      return res.data;
    } catch (err) {
      console.warn('[PlanningPipeline] AI provider failed on understand, using TemplatePlanner fallback:', err);
      const res = await this.fallbackProvider.generateStructured(prompt, IntentAnalysisSchema);
      return res.data;
    }
  }

  async generate(
    instruction: string,
    userId = 'system',
    clarifications?: Record<string, string>
  ): Promise<PlanGenerationResult> {
    return this.generatePlan(instruction, userId, clarifications);
  }

  async generatePlan(
    instruction: string,
    userId = 'system',
    clarifications?: Record<string, string>
  ): Promise<PlanGenerationResult> {
    // 1. Understand Phase
    const intent = await this.understand(instruction);

    // If missing essentials and no clarifications provided, do NOT plan
    if (!intent.can_proceed && (!clarifications || Object.keys(clarifications).length === 0)) {
      throw new Error(
        `Cannot construct plan: missing essential information. Clarifications required: ${intent.clarifying_questions.join('; ')}`
      );
    }

    const ai = this.getProvider();
    const availableTools = ToolRegistry.getInstance()
      .getAllTools()
      .map((t) => `${t.name}: [${Object.keys(t.actions).join(', ')}]`)
      .join('\n');

    const systemPrompt = `You are TASKNOVA's Autonomous Planning Engine.
Generate an optimal DAG execution plan for the user instruction.
You may ONLY use registered actions:
${availableTools}
Every step must have: id, name, tool, action, input, depends_on, requires_approval, risk_level, expected_output, verification_method, reason, estimated_seconds, idempotent.
Preserve the exact original instruction in preserved_original_instruction.
Do not invent mock data. Return strictly valid JSON conforming to ExecutionPlanSchema.`;

    let prompt = `ExecutionPlan for Instruction: "${instruction}"`;
    if (clarifications && Object.keys(clarifications).length > 0) {
      prompt += `\nClarifications provided: ${JSON.stringify(clarifications)}`;
    }

    let rawPlan: ExecutionPlan;
    let plannerUsed = ai.name;
    let fallbackUsed = false;
    const warnings: string[] = [];

    // 2. Generate Plan
    try {
      const res = await ai.generateStructured(prompt, ExecutionPlanSchema, systemPrompt);
      rawPlan = res.data;
      plannerUsed = res.provider;
    } catch (err) {
      console.warn('[PlanningPipeline] Initial plan generation failed, attempting automatic repair:', err);
      // Attempt 1 automatic repair retry with error details
      try {
        const repairPrompt = `${prompt}\n\nPrevious attempt failed with error: ${err instanceof Error ? err.message : String(err)}. Please repair and output valid JSON conforming strictly to schema.`;
        const res = await ai.generateStructured(repairPrompt, ExecutionPlanSchema, systemPrompt);
        rawPlan = res.data;
        plannerUsed = res.provider;
      } catch (repairErr) {
        console.warn('[PlanningPipeline] Repair retry failed, falling back to TemplatePlanner:', repairErr);
        const res = await this.fallbackProvider.generateStructured(prompt, ExecutionPlanSchema);
        rawPlan = res.data;
        plannerUsed = 'template';
        fallbackUsed = true;
        warnings.push('Planning generated using deterministic template fallback engine.');
      }
    }

    // 3. Validate DAG & Enforce Security Policies
    const validation = this.dagValidator.validateAndEnforce(rawPlan);
    let finalPlan: ExecutionPlan = validation.repairedPlan || rawPlan;

    if (!validation.isValid) {
      console.warn('[PlanningPipeline] DAG validation failed on plan, falling back to safe TemplatePlanner:', validation.errors);
      const res = await this.fallbackProvider.generateStructured(prompt, ExecutionPlanSchema);
      finalPlan = res.data;
      plannerUsed = 'template';
      fallbackUsed = true;
      warnings.push('Planning generated using deterministic template fallback engine.');
    }

    // 4. Apply User Policies
    const policySteps = await this.policyEngine.applyPolicies(userId, finalPlan.steps);
    finalPlan.steps = policySteps;

    // Ensure original instruction is preserved
    finalPlan.preserved_original_instruction = instruction;
    (finalPlan as any).original_instruction = instruction;

    return {
      plan: finalPlan,
      planner_used: plannerUsed,
      fallback_used: fallbackUsed,
      intent,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}
