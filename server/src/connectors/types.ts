export interface ExecutionContext {
  taskId: string;
  stepId: string;
  userId: string;
  mode: 'demo' | 'live';
}

export interface ConnectorResult {
  success: boolean;
  data: unknown;
  message: string;
  mode: 'demo' | 'live';
  outputRef?: string;
  metadata?: Record<string, unknown>;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  evidence: unknown;
  message?: string;
}

export interface ToolConnector {
  name: string;
  mode: 'demo' | 'live';
  isConnected(): Promise<boolean>;
  validateAction(
    action: string,
    input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }>;
  execute(
    action: string,
    input: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ConnectorResult>;
  verify(
    action: string,
    result: unknown,
    expectedOutput: string
  ): Promise<VerificationResult>;
}
