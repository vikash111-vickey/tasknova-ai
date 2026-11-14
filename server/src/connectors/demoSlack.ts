import { v4 as uuidv4 } from 'uuid';
import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';
import { DemoStore } from './demoStore';

export class DemoSlackConnector implements ToolConnector {
  public name = 'slack';
  public mode: 'demo' = 'demo';
  private demoStore = DemoStore.getInstance();

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    if (action !== 'slack.post_message') {
      return { valid: false, error: `Unsupported action "${action}" for Slack.` };
    }
    if (!input.message && !input.text) {
      return { valid: false, error: 'Slack message text is required.' };
    }
    return { valid: true };
  }

  public async execute(
    _action: string,
    input: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<ConnectorResult> {
    const channel = String(input.channel || '#ops-alerts');
    const message = String(input.message || input.text || '');
    const id = `slack_${uuidv4()}`;

    const entry = {
      id,
      channel,
      message,
      timestamp: new Date().toISOString(),
      mode: 'demo' as const,
    };

    this.demoStore.slackMessages.push(entry);

    return {
      success: true,
      data: entry,
      message: `Message dispatched to Slack channel ${channel}. [DEMO]`,
      mode: 'demo',
      outputRef: id,
    };
  }

  public async verify(
    _action: string,
    result: unknown,
    _expectedOutput: string
  ): Promise<VerificationResult> {
    const data = (result as any)?.data || result;
    const item = this.demoStore.slackMessages.find((m) => m.id === data?.id);
    if (item) {
      return {
        verified: true,
        confidence: 1.0,
        evidence: { messageId: item.id, channel: item.channel },
        message: 'Confirmed: Message posted to Demo Slack webhook.',
      };
    }
    return { verified: false, confidence: 0, evidence: null, message: 'Slack message not found.' };
  }
}
