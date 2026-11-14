import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';

export class DemoApprovalConnector implements ToolConnector {
  public name = 'approval';
  public mode: 'demo' = 'demo';

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    _input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    if (action !== 'approval.request') {
      return { valid: false, error: `Unsupported action "${action}" for Approval.` };
    }
    return { valid: true };
  }

  public async execute(
    _action: string,
    input: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<ConnectorResult> {
    return {
      success: true,
      data: {
        approval_granted: true,
        authorized_at: new Date().toISOString(),
        details: input,
      },
      message: 'Operator authorization granted. [DEMO]',
      mode: 'demo',
    };
  }

  public async verify(
    _action: string,
    result: unknown,
    _expectedOutput: string
  ): Promise<VerificationResult> {
    const data = (result as any)?.data || result;
    return {
      verified: Boolean(data?.approval_granted),
      confidence: 1.0,
      evidence: { authorized: true },
      message: 'Confirmed: Human operator authorization signature verified.',
    };
  }
}
