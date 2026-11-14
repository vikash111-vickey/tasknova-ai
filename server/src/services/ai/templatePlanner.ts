import { z } from 'zod';
import { AIProvider, GenerateResult } from './types';
import { ExecutionPlan, ExecutionPlanSchema } from '../planning/schemas';

export class TemplatePlanner implements AIProvider {
  name: 'template' = 'template';

  public async generatePlan(instruction: string): Promise<ExecutionPlan> {
    const res = await this.generateStructured(
      `ExecutionPlan for Instruction: "${instruction}"`,
      ExecutionPlanSchema
    );
    return res.data;
  }

  async generateStructured<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _systemPrompt?: string
  ): Promise<GenerateResult<z.output<T>>> {
    const lowerPrompt = prompt.toLowerCase();

    // Check if generating IntentAnalysis or ExecutionPlan
    const isIntentAnalysis = prompt.includes('IntentAnalysis') || prompt.includes('intent analysis');

    let templateData: unknown;

    if (isIntentAnalysis) {
      templateData = this.generateTemplateIntent(lowerPrompt, prompt);
    } else {
      templateData = this.generateTemplatePlan(lowerPrompt, prompt);
    }

    // Strictly validate against schema
    const parsed = schema.safeParse(templateData);
    if (!parsed.success) {
      throw new Error(
        `TemplatePlanner output failed schema validation: ${parsed.error.errors.map((e) => e.message).join(', ')}`
      );
    }

    return {
      data: parsed.data,
      provider: 'template',
      fallbackUsed: false,
      rawPrompt: prompt,
    };
  }

  private generateTemplateIntent(lower: string, originalPrompt: string) {
    // Extract instruction text from prompt
    const instructionMatch = originalPrompt.match(/Instruction:\s*"([^"]+)"/i) || [null, originalPrompt];
    const instruction = instructionMatch[1] || originalPrompt;

    // Check for missing critical parameters (e.g. prompt is too ambiguous like "do something" or "send it" or vague "send email")
    const words = instruction.trim().split(/\s+/);
    const isVague =
      words.length < 3 ||
      (words.length <= 3 && lower.includes('email') && !lower.includes('@')) ||
      lower.includes('do something') ||
      lower.includes('fix it') ||
      lower.includes('send it without details');

    if (isVague) {
      return {
        objective: 'Ambiguous or incomplete user instruction',
        requested_actions: [],
        target_apps: [],
        required_data: ['recipient', 'target_source', 'action_parameters'],
        expected_output: 'Clarification required before constructing execution plan',
        time_constraints: 'none',
        missing_information: [
          'Target service or recipient not specified',
          'Operation scope or data criteria missing',
        ],
        clarifying_questions: [
          'Which application or service would you like to run this action on (e.g. Email, Slack, Sheets)?',
          'Who is the intended recipient or target record for this operation?',
        ],
        risk_summary: 'Cannot proceed safely without specifying target actions.',
        can_proceed: false,
      };
    }

    // 1. Weekly Report / Invoice Reconciliation
    if ((lower.includes('report') && !lower.includes('drive')) || lower.includes('invoice') || lower.includes('reconcil')) {
      return {
        objective: 'Reconcile weekly Stripe invoices and generate executive report',
        requested_actions: ['stripe.list_charges', 'store.match_invoices', 'reports.generate_summary', 'email.send'],
        target_apps: ['stripe', 'store', 'reports', 'email'],
        required_data: ['date_range', 'stripe_account_id', 'recipient_email'],
        expected_output: 'Verified audit summary with transaction matches and dispatched digest email',
        time_constraints: 'Weekly execution cycle',
        missing_information: [],
        clarifying_questions: [],
        risk_summary: 'Outbound email dispatch requires human operator approval before sending.',
        can_proceed: true,
      };
    }

    // 2. Executive Meeting Scheduling Flow
    if (lower.includes('meet') || lower.includes('schedul') || lower.includes('calendar')) {
      return {
        objective: 'Schedule executive meeting with attendees and send calendar invitations',
        requested_actions: ['calendar.check_availability', 'calendar.create_event', 'approval.request', 'email.send'],
        target_apps: ['calendar', 'approval', 'email'],
        required_data: ['attendees', 'time_range', 'title'],
        expected_output: 'Confirmed calendar event booking and delivered invitations',
        time_constraints: 'Scheduled timing',
        missing_information: [],
        clarifying_questions: [],
        risk_summary: 'Outbound meeting invitation dispatch requires human confirmation.',
        can_proceed: true,
      };
    }

    // 3. Drive Document Organization & Synthesis
    if (lower.includes('drive') || lower.includes('organize') || lower.includes('contract') || lower.includes('archive')) {
      return {
        objective: 'Search Google Drive for files, synthesize executive summary, and archive report',
        requested_actions: ['drive.list_files', 'reports.generate_summary', 'drive.upload_file'],
        target_apps: ['drive', 'reports'],
        required_data: ['search_query', 'target_folder'],
        expected_output: 'Synthesized executive PDF uploaded and verified in Google Drive',
        time_constraints: 'Immediate batch run',
        missing_information: [],
        clarifying_questions: [],
        risk_summary: 'Drive file search, document synthesis, and automated cloud upload.',
        can_proceed: true,
      };
    }

    // 2. Onboarding Verification
    if (lower.includes('onboard') || lower.includes('identity') || lower.includes('credential')) {
      return {
        objective: 'Verify new member credentials and send welcome onboarding package',
        requested_actions: ['store.get_user', 'verifier.verify_document', 'email.send'],
        target_apps: ['store', 'verifier', 'email'],
        required_data: ['user_id', 'document_hash', 'recipient_email'],
        expected_output: 'Cryptographically signed verification proof and delivered welcome package',
        time_constraints: 'Immediate on submission',
        missing_information: [],
        clarifying_questions: [],
        risk_summary: 'External identity credential verification and welcome email dispatch.',
        can_proceed: true,
      };
    }

    // 3. Communications & Outbound Alerts (Slack, Email)
    if (lower.includes('slack') || lower.includes('alert') || lower.includes('email') || lower.includes('message')) {
      return {
        objective: 'Dispatch communication or alert to specified channel or recipient',
        requested_actions: ['store.match_invoices', 'approval.request', lower.includes('slack') ? 'slack.post_message' : 'email.send'],
        target_apps: [lower.includes('slack') ? 'slack' : 'email', 'approval', 'store'],
        required_data: ['recipient_or_channel', 'content'],
        expected_output: 'Confirmed delivery receipt after operator authorization',
        time_constraints: 'Immediate on operator approval',
        missing_information: [],
        clarifying_questions: [],
        risk_summary: 'External communication requires human operator approval prior to dispatch.',
        can_proceed: true,
      };
    }

    // 4. Default / Custom Workflow
    return {
      objective: `Execute task: ${instruction.substring(0, 80)}`,
      requested_actions: ['store.match_invoices', 'reports.generate_summary'],
      target_apps: ['store', 'reports'],
      required_data: ['input_query'],
      expected_output: 'Verified execution output and audit proof receipt',
      time_constraints: 'As requested',
      missing_information: [],
      clarifying_questions: [],
      risk_summary: 'Standard automated agent task execution within LocalStore boundaries.',
      can_proceed: true,
    };
  }

  private generateTemplatePlan(lower: string, originalPrompt: string) {
    const instructionMatch = originalPrompt.match(/Instruction:\s*"([^"]+)"/i) || [null, originalPrompt];
    const rawInstruction = instructionMatch[1] || originalPrompt;

    // 1. Weekly Report / Invoice Digest
    if ((lower.includes('report') && !lower.includes('drive')) || lower.includes('invoice') || lower.includes('reconcil')) {
      return {
        title: 'Weekly Invoice Reconciliation & Executive Digest',
        objective: 'Reconcile Stripe charges with local database records and email verified report.',
        preserved_original_instruction: rawInstruction,
        estimated_total_seconds: 45,
        risk_level: 'medium',
        steps: [
          {
            id: 'step_1',
            name: 'Collect Stripe Invoices',
            tool: 'stripe',
            action: 'stripe.list_charges',
            input: { limit: 100, status: 'paid' },
            depends_on: [],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Array of verified transaction charges',
            verification_method: 'schema_validation',
            reason: 'Retrieve paid transactions from payment processor',
            estimated_seconds: 5,
            idempotent: true,
          },
          {
            id: 'step_2',
            name: 'Match with Store Orders',
            tool: 'store',
            action: 'store.match_invoices',
            input: { sourceStep: 'step_1' },
            depends_on: ['step_1'],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Reconciliation balance delta report',
            verification_method: 'hash_check',
            reason: 'Reconcile database order items with merchant settlement logs',
            estimated_seconds: 10,
            idempotent: true,
          },
          {
            id: 'step_3',
            name: 'Generate Audit Summary',
            tool: 'reports',
            action: 'reports.generate_summary',
            input: { reconciliationStep: 'step_2' },
            depends_on: ['step_2'],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'PDF/HTML executive summary with cryptographic signature',
            verification_method: 'signature_verification',
            reason: 'Prepare verifiable digest document for executive review',
            estimated_seconds: 15,
            idempotent: true,
          },
          {
            id: 'step_4',
            name: 'Approve: Dispatch Report Email',
            tool: 'approval',
            action: 'approval.request',
            input: {
              target: 'email.send',
              description: 'Approve sending weekly reconciliation report to finance team',
            },
            depends_on: ['step_3'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Operator authorization signature',
            verification_method: 'operator_authorization',
            reason: 'Enforce human review policy before external email dispatch',
            estimated_seconds: 5,
            idempotent: false,
          },
          {
            id: 'step_5',
            name: 'Dispatch Summary Email',
            tool: 'email',
            action: 'email.send',
            input: {
              recipient: 'finance@tasknova.local',
              subject: 'Weekly Financial Reconciliation & Settlement Report',
              attachmentStep: 'step_3',
            },
            depends_on: ['step_4'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Delivered message ID and SMTP verification hash',
            verification_method: 'smtp_receipt',
            reason: 'Transmit finalized report to executive recipients',
            estimated_seconds: 10,
            idempotent: false,
          },
        ],
      };
    }

    // 2. Executive Meeting Scheduling Flow
    if (lower.includes('meet') || lower.includes('schedul') || lower.includes('calendar')) {
      return {
        title: 'Executive Meeting Scheduling & Invites',
        objective: 'Reconcile participant calendars, schedule event, and dispatch invites upon approval.',
        preserved_original_instruction: rawInstruction,
        estimated_total_seconds: 30,
        risk_level: 'medium',
        steps: [
          {
            id: 'step_1',
            name: 'Check Participant Availability',
            tool: 'calendar',
            action: 'calendar.check_availability',
            input: { attendees: ['alex@tasknova.local', 'jordan@tasknova.local'] },
            depends_on: [],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Available time slot confirmation',
            verification_method: 'calendar_availability_check',
            reason: 'Identify mutually open time window for attendees',
            estimated_seconds: 5,
            idempotent: true,
          },
          {
            id: 'step_2',
            name: 'Create Calendar Event',
            tool: 'calendar',
            action: 'calendar.create_event',
            input: {
              title: 'Strategic Sync: Leadership Planning',
              startTime: new Date(Date.now() + 86400000).toISOString(),
              endTime: new Date(Date.now() + 90000000).toISOString(),
              attendees: ['alex@tasknova.local', 'jordan@tasknova.local'],
            },
            depends_on: ['step_1'],
            requires_approval: false,
            risk_level: 'medium',
            expected_output: 'Confirmed calendar event record',
            verification_method: 'calendar_event_exists',
            reason: 'Reserve time slot in team calendar',
            estimated_seconds: 10,
            idempotent: false,
          },
          {
            id: 'step_3',
            name: 'Approve: Dispatch Invites',
            tool: 'approval',
            action: 'approval.request',
            input: {
              target: 'email.send',
              description: 'Approve sending meeting confirmation emails to Alex and Jordan',
            },
            depends_on: ['step_2'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Operator authorization signature',
            verification_method: 'operator_authorization',
            reason: 'Human verification required before dispatching calendar notifications',
            estimated_seconds: 5,
            idempotent: false,
          },
          {
            id: 'step_4',
            name: 'Dispatch Invite Emails',
            tool: 'email',
            action: 'email.send',
            input: {
              recipient: 'alex@tasknova.local, jordan@tasknova.local',
              subject: 'Invitation: Strategic Sync Meeting',
              body: 'You have been invited to the Strategic Sync Meeting.',
            },
            depends_on: ['step_3'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Delivery confirmation receipt',
            verification_method: 'smtp_receipt',
            reason: 'Notify meeting attendees via email',
            estimated_seconds: 10,
            idempotent: false,
          },
        ],
      };
    }

    // 3. Drive Document Organization & Synthesis
    if (lower.includes('drive') || lower.includes('organize') || lower.includes('contract') || lower.includes('archive')) {
      return {
        title: 'Drive Document Organization & Synthesis',
        objective: 'Locate files across Google Drive, generate synthesized PDF digest, and upload verified report.',
        preserved_original_instruction: rawInstruction,
        estimated_total_seconds: 35,
        risk_level: 'low',
        steps: [
          {
            id: 'step_1',
            name: 'Search Files in Google Drive',
            tool: 'drive',
            action: 'drive.list_files',
            input: { query: 'audit', folder: '/' },
            depends_on: [],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'List of matching drive files',
            verification_method: 'drive_files_exist',
            reason: 'Scan Google Drive for relevant documents and customer agreements',
            estimated_seconds: 10,
            idempotent: true,
          },
          {
            id: 'step_2',
            name: 'Synthesize Executive Summary',
            tool: 'reports',
            action: 'reports.generate_summary',
            input: { sourceStep: 'step_1', format: 'pdf' },
            depends_on: ['step_1'],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Formatted PDF document summary',
            verification_method: 'signature_verification',
            reason: 'Extract key clauses and summarize findings into structured report',
            estimated_seconds: 15,
            idempotent: true,
          },
          {
            id: 'step_3',
            name: 'Upload Report to Drive',
            tool: 'drive',
            action: 'drive.upload_file',
            input: {
              name: 'Executive_Audit_Summary_Q4.pdf',
              folder: '/Reports',
              content: 'Synthesized executive audit report content',
            },
            depends_on: ['step_2'],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Uploaded file metadata and checksum',
            verification_method: 'drive_file_checksum',
            reason: 'Archive verified report back into Google Drive',
            estimated_seconds: 10,
            idempotent: false,
          },
        ],
      };
    }

    // 2. Customer Onboarding Verification
    if (lower.includes('onboard') || lower.includes('identity') || lower.includes('credential')) {
      return {
        title: 'Customer Onboarding & Identity Verification Flow',
        objective: 'Verify identity documents, provision customer demo workspace, and deliver onboarding keys.',
        preserved_original_instruction: rawInstruction,
        estimated_total_seconds: 40,
        risk_level: 'medium',
        steps: [
          {
            id: 'step_1',
            name: 'Verify DNS & Identity Document',
            tool: 'verifier',
            action: 'verifier.verify_document',
            input: { domain: 'acme.corp', type: 'enterprise' },
            depends_on: [],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Cryptographic identity proof hash',
            verification_method: 'signature_verification',
            reason: 'Authenticate enterprise domain integrity and public keys',
            estimated_seconds: 10,
            idempotent: true,
          },
          {
            id: 'step_2',
            name: 'Provision Customer Workspace',
            tool: 'store',
            action: 'store.match_invoices',
            input: { customer: 'Acme Corp', tier: 'enterprise' },
            depends_on: ['step_1'],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Provisioned workspace credentials record',
            verification_method: 'schema_validation',
            reason: 'Initialize dedicated workspace environment in database',
            estimated_seconds: 15,
            idempotent: true,
          },
          {
            id: 'step_3',
            name: 'Approve: Dispatch Onboarding Credentials',
            tool: 'approval',
            action: 'approval.request',
            input: {
              target: 'email.send',
              description: 'Authorize delivery of enterprise workspace invite to admin@acme.corp',
            },
            depends_on: ['step_2'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Operator authorization signature',
            verification_method: 'operator_authorization',
            reason: 'Human verification required before contacting client',
            estimated_seconds: 5,
            idempotent: false,
          },
          {
            id: 'step_4',
            name: 'Send Welcome Email',
            tool: 'email',
            action: 'email.send',
            input: { recipient: 'admin@acme.corp', subject: 'Welcome to TASKNOVA Enterprise' },
            depends_on: ['step_3'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Delivery confirmation receipt',
            verification_method: 'smtp_receipt',
            reason: 'Deliver onboarding confirmation and keys to new user',
            estimated_seconds: 10,
            idempotent: false,
          },
        ],
      };
    }

    // 3. Communications & Outbound Alerts (Slack, Email)
    if (lower.includes('slack') || lower.includes('alert') || lower.includes('email') || lower.includes('message') || lower.includes('audit')) {
      const isSlack = lower.includes('slack');
      const actionName = isSlack ? 'slack.post_message' : 'email.send';
      const toolName = isSlack ? 'slack' : 'email';
      const title = lower.includes('audit')
        ? 'Integration Health Audit & Alert Dispatch'
        : isSlack
        ? 'Slack Alert Notification Dispatch'
        : 'Outbound Email Communication';
      return {
        title,
        objective: `Dispatch notification: ${rawInstruction.substring(0, 90)}`,
        preserved_original_instruction: rawInstruction,
        estimated_total_seconds: 25,
        risk_level: 'medium',
        steps: [
          {
            id: 'step_1',
            name: 'Collect Context Data',
            tool: 'store',
            action: 'store.match_invoices',
            input: { filter: 'pending_alerts' },
            depends_on: [],
            requires_approval: false,
            risk_level: 'low',
            expected_output: 'Context records retrieved',
            verification_method: 'schema_validation',
            reason: 'Retrieve necessary details before constructing dispatch payload',
            estimated_seconds: 5,
            idempotent: true,
          },
          {
            id: 'step_2',
            name: `Approve: ${isSlack ? 'Slack Dispatch' : 'Email Send'}`,
            tool: 'approval',
            action: 'approval.request',
            input: {
              target: actionName,
              description: 'Human operator approval required before dispatching external communication',
            },
            depends_on: ['step_1'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Operator signature authorization',
            verification_method: 'operator_authorization',
            reason: 'Enforce human oversight policy for external outbound data',
            estimated_seconds: 5,
            idempotent: false,
          },
          {
            id: 'step_3',
            name: isSlack ? 'Post Slack Message' : 'Send Email Message',
            tool: toolName,
            action: actionName,
            input: isSlack
              ? { channel: '#ops-alerts', message: 'System alert' }
              : { recipient: 'finance@tasknova.local', subject: 'Notification', body: 'Digest' },
            depends_on: ['step_2'],
            requires_approval: true,
            risk_level: 'medium',
            expected_output: 'Delivery confirmation receipt',
            verification_method: isSlack ? 'slack_receipt' : 'smtp_receipt',
            reason: 'Transmit message to designated destination',
            estimated_seconds: 10,
            idempotent: false,
          },
        ],
      };
    }

    // 4. Default Task Plan
    return {
      title: 'Autonomous Task Execution Flow',
      objective: `Execute: ${rawInstruction.substring(0, 90)}`,
      preserved_original_instruction: rawInstruction,
      estimated_total_seconds: 30,
      risk_level: 'low',
      steps: [
        {
          id: 'step_1',
          name: 'Inspect System Data',
          tool: 'store',
          action: 'store.match_invoices',
          input: { query: 'active' },
          depends_on: [],
          requires_approval: false,
          risk_level: 'low',
          expected_output: 'Retrieved matching records',
          verification_method: 'schema_validation',
          reason: 'Gather necessary context from storage records',
          estimated_seconds: 10,
          idempotent: true,
        },
        {
          id: 'step_2',
          name: 'Generate Result Summary',
          tool: 'reports',
          action: 'reports.generate_summary',
          input: { sourceStep: 'step_1' },
          depends_on: ['step_1'],
          requires_approval: false,
          risk_level: 'low',
          expected_output: 'Compiled summary and proof',
          verification_method: 'signature_verification',
          reason: 'Synthesize output and record completion receipt',
          estimated_seconds: 10,
          idempotent: true,
        },
      ],
    };
  }
}
