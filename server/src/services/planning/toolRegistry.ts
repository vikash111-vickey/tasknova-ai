import { z } from 'zod';

export interface ActionDefinition {
  name: string;
  description: string;
  tool: string;
  inputSchema: z.ZodTypeAny;
  isExternal: boolean;
  requiresDefaultApproval: boolean;
  isIdempotent: boolean;
  defaultRisk: 'low' | 'medium' | 'high';
}

export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  status: 'connected' | 'demo' | 'available';
  actions: Record<string, ActionDefinition>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();

  private constructor() {
    this.registerBuiltinTools();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private registerBuiltinTools(): void {
    // 1. Stripe Tool
    this.registerTool({
      name: 'stripe',
      displayName: 'Stripe Finance',
      description: 'Collect transaction charges and invoice receipts',
      status: 'demo',
      actions: {
        'stripe.list_charges': {
          name: 'stripe.list_charges',
          tool: 'stripe',
          description: 'Fetch recent paid charges and receipts',
          inputSchema: z.object({ limit: z.number().optional(), status: z.string().optional() }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'stripe.get_charge': {
          name: 'stripe.get_charge',
          tool: 'stripe',
          description: 'Fetch specific charge details by ID',
          inputSchema: z.object({ chargeId: z.string() }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
      },
    });

    // 2. LocalStore / Database Tool
    this.registerTool({
      name: 'store',
      displayName: 'LocalStore Database',
      description: 'Internal zero-config database storage and accounts match',
      status: 'connected',
      actions: {
        'store.match_invoices': {
          name: 'store.match_invoices',
          tool: 'store',
          description: 'Match invoice receipts with internal records',
          inputSchema: z.object({ referenceStep: z.string().optional(), filter: z.string().optional() }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'store.get_user': {
          name: 'store.get_user',
          tool: 'store',
          description: 'Fetch user records and submitted proofs',
          inputSchema: z.object({ userId: z.string().optional() }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'store.write_record': {
          name: 'store.write_record',
          tool: 'store',
          description: 'Persist record to store',
          inputSchema: z.object({ table: z.string(), record: z.record(z.unknown()) }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: false,
          defaultRisk: 'medium',
        },
      },
    });

    // 3. Reports Tool
    this.registerTool({
      name: 'reports',
      displayName: 'Executive Reports',
      description: 'Format audits and metrics into markdown and JSON summaries',
      status: 'connected',
      actions: {
        'reports.generate_summary': {
          name: 'reports.generate_summary',
          tool: 'reports',
          description: 'Generate report summary from referenced step data',
          inputSchema: z.object({ referenceStep: z.string().optional(), format: z.string().optional() }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
      },
    });

    // 4. Verifier Tool
    this.registerTool({
      name: 'verifier',
      displayName: 'Verification Engine',
      description: 'Cryptographic SHA-256 proof hashing and verification signatures',
      status: 'connected',
      actions: {
        'verifier.sign_receipt': {
          name: 'verifier.sign_receipt',
          tool: 'verifier',
          description: 'Sign output with unforgeable SHA-256 proof receipt',
          inputSchema: z.object({ referenceStep: z.string() }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'verifier.verify_document': {
          name: 'verifier.verify_document',
          tool: 'verifier',
          description: 'Verify identity credentials against proof requirements',
          inputSchema: z.object({ documentId: z.string().optional() }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
      },
    });

    // 5. Email Tool (External write -> requires approval)
    this.registerTool({
      name: 'email',
      displayName: 'Email Service',
      description: 'Send emails to stakeholders and recipients',
      status: 'demo',
      actions: {
        'email.send': {
          name: 'email.send',
          tool: 'email',
          description: 'Deliver external email message',
          inputSchema: z.object({
            recipient: z.string(),
            subject: z.string(),
            body: z.string().optional(),
            reportStep: z.string().optional(),
          }),
          isExternal: true,
          requiresDefaultApproval: true, // External email strictly requires approval
          isIdempotent: false,
          defaultRisk: 'medium',
        },
      },
    });

    // 6. Slack Tool
    this.registerTool({
      name: 'slack',
      displayName: 'Slack Notifier',
      description: 'Broadcast alerts to Slack channels',
      status: 'demo',
      actions: {
        'slack.post_message': {
          name: 'slack.post_message',
          tool: 'slack',
          description: 'Post alert message to channel',
          inputSchema: z.object({ channel: z.string(), message: z.string() }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: false,
          defaultRisk: 'low',
        },
      },
    });

    // 7. Google Sheets Tool
    this.registerTool({
      name: 'sheets',
      displayName: 'Google Sheets',
      description: 'Read and append tabular spreadsheet rows',
      status: 'demo',
      actions: {
        'sheets.read_rows': {
          name: 'sheets.read_rows',
          tool: 'sheets',
          description: 'Read rows from spreadsheet range',
          inputSchema: z.object({ sheetId: z.string().optional(), range: z.string().optional() }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'sheets.append_row': {
          name: 'sheets.append_row',
          tool: 'sheets',
          description: 'Append row to spreadsheet',
          inputSchema: z.object({ sheetId: z.string().optional(), rowData: z.array(z.unknown()) }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: false,
          defaultRisk: 'medium',
        },
      },
    });

    // 8. Human Approval Tool
    this.registerTool({
      name: 'approval',
      displayName: 'Human-in-the-Loop Approval',
      description: 'Pause execution and require manual operator confirmation',
      status: 'connected',
      actions: {
        'approval.request': {
          name: 'approval.request',
          tool: 'approval',
          description: 'Request operator confirmation before sensitive operation',
          inputSchema: z.object({ target: z.string(), description: z.string() }),
          isExternal: false,
          requiresDefaultApproval: false,
          isIdempotent: false,
          defaultRisk: 'low',
        },
      },
    });

    // 9. Calendar Tool
    this.registerTool({
      name: 'calendar',
      displayName: 'Google Calendar',
      description: 'Check schedule availability and book events',
      status: 'demo',
      actions: {
        'calendar.check_availability': {
          name: 'calendar.check_availability',
          tool: 'calendar',
          description: 'Check free/busy time slots for participants',
          inputSchema: z.object({ attendees: z.array(z.string()).optional(), timeMin: z.string().optional() }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'calendar.create_event': {
          name: 'calendar.create_event',
          tool: 'calendar',
          description: 'Schedule a new calendar event with participants',
          inputSchema: z.object({
            title: z.string(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            attendees: z.array(z.string()).optional(),
          }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: false,
          defaultRisk: 'medium',
        },
      },
    });

    // 10. Drive Tool
    this.registerTool({
      name: 'drive',
      displayName: 'Google Drive',
      description: 'Search, organize and upload documents',
      status: 'demo',
      actions: {
        'drive.list_files': {
          name: 'drive.list_files',
          tool: 'drive',
          description: 'Search and list files in Drive',
          inputSchema: z.object({ folder: z.string().optional(), query: z.string().optional() }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: true,
          defaultRisk: 'low',
        },
        'drive.upload_file': {
          name: 'drive.upload_file',
          tool: 'drive',
          description: 'Upload a report or document to Drive',
          inputSchema: z.object({
            name: z.string().optional(),
            fileName: z.string().optional(),
            content: z.string().optional(),
            folder: z.string().optional(),
          }),
          isExternal: true,
          requiresDefaultApproval: false,
          isIdempotent: false,
          defaultRisk: 'low',
        },
      },
    });
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getAction(actionName: string): ActionDefinition | undefined {
    for (const tool of this.tools.values()) {
      if (tool.actions[actionName]) {
        return tool.actions[actionName];
      }
    }
    return undefined;
  }

  public isActionRegistered(actionName: string): boolean {
    return Boolean(this.getAction(actionName));
  }
}
