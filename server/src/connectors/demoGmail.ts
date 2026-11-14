import { v4 as uuidv4 } from 'uuid';
import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';
import { DemoStore } from './demoStore';

export class DemoGmailConnector implements ToolConnector {
  public name = 'gmail';
  public mode: 'demo' = 'demo';
  private demoStore = DemoStore.getInstance();

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const supported = [
      'gmail.search_emails',
      'gmail.read_email',
      'gmail.draft_email',
      'gmail.send_email',
      'email.send',
    ];

    if (!supported.includes(action)) {
      return { valid: false, error: `Unsupported action "${action}" for Gmail connector.` };
    }

    if (action === 'gmail.send_email' || action === 'email.send') {
      if (!input.recipient && !input.to) {
        return { valid: false, error: 'Recipient email address is required.' };
      }
    }

    return { valid: true };
  }

  public async execute(
    action: string,
    input: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<ConnectorResult> {
    const valid = await this.validateAction(action, input);
    if (!valid.valid) {
      throw new Error(valid.error);
    }

    if (action === 'gmail.search_emails') {
      const query = String(input.query || '').toLowerCase();
      const label = input.label ? String(input.label).toUpperCase() : null;

      let results = [...this.demoStore.emails];
      if (label) {
        results = results.filter((e) => e.labels.includes(label));
      }
      if (query) {
        results = results.filter(
          (e) =>
            e.subject.toLowerCase().includes(query) ||
            e.body.toLowerCase().includes(query) ||
            e.sender.toLowerCase().includes(query)
        );
      }

      return {
        success: true,
        data: {
          emails: results,
          total: results.length,
          query,
        },
        message: `Found ${results.length} demo emails matching query. [DEMO]`,
        mode: 'demo',
      };
    }

    if (action === 'gmail.read_email') {
      const emailId = String(input.emailId || input.id || '');
      const found = this.demoStore.emails.find((e) => e.id === emailId);
      if (!found) {
        throw new Error(`Demo email with ID "${emailId}" not found in demo mailbox.`);
      }

      return {
        success: true,
        data: found,
        message: `Demo email "${emailId}" retrieved successfully. [DEMO]`,
        mode: 'demo',
      };
    }

    if (action === 'gmail.draft_email') {
      const recipient = String(input.recipient || input.to || '');
      const subject = String(input.subject || 'Draft');
      const body = String(input.body || '');

      return {
        success: true,
        data: {
          draftId: `draft_${uuidv4().substring(0, 8)}`,
          recipient,
          subject,
          body,
        },
        message: 'Draft created in demo mailbox. [DEMO]',
        mode: 'demo',
      };
    }

    if (action === 'gmail.send_email' || action === 'email.send') {
      const recipient = String(input.recipient || input.to || '');
      const subject = String(input.subject || 'Weekly Report & Progress Update');
      const body = String(input.body || 'Attached is your weekly progress report.');
      const attachmentId = input.attachmentId ? String(input.attachmentId) : undefined;
      const attachmentName = input.attachmentName ? String(input.attachmentName) : undefined;

      const outboxEntry = {
        id: `demo_send_${uuidv4()}`,
        recipient,
        subject,
        body,
        attachmentId,
        attachmentName,
        timestamp: new Date().toISOString(),
        status: 'accepted_by_demo_mail_server' as const,
        mode: 'demo' as const,
      };

      this.demoStore.outbox.push(outboxEntry);

      return {
        success: true,
        data: outboxEntry,
        message: 'Demo send accepted by demo mail server',
        mode: 'demo',
        outputRef: outboxEntry.id,
      };
    }

    throw new Error(`Unhandled action: ${action}`);
  }

  public async verify(
    action: string,
    result: unknown,
    _expectedOutput: string
  ): Promise<VerificationResult> {
    if (action === 'gmail.send_email' || action === 'email.send') {
      const data = (result as any)?.data || result;
      const outboxItem = this.demoStore.outbox.find((o) => o.id === data?.id);
      if (outboxItem && outboxItem.status === 'accepted_by_demo_mail_server') {
        return {
          verified: true,
          confidence: 1.0,
          evidence: {
            outboxId: outboxItem.id,
            recipient: outboxItem.recipient,
            status: outboxItem.status,
            receiptHash: `sha256_${outboxItem.id.substring(0, 16)}`,
          },
          message: 'Confirmed: Accepted by provider mail server (delivery or reading not claimed). [DEMO]',
        };
      }
      return {
        verified: false,
        confidence: 0,
        evidence: null,
        message: 'Email not found in demo mail server outbox.',
      };
    }

    if (action === 'gmail.search_emails' || action === 'gmail.read_email') {
      return {
        verified: Boolean((result as any)?.success),
        confidence: 1.0,
        evidence: { retrieved: true },
      };
    }

    return {
      verified: true,
      confidence: 0.9,
      evidence: { action },
    };
  }
}
