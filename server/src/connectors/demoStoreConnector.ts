import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';

export class DemoStoreConnector implements ToolConnector {
  public name = 'store';
  public mode: 'demo' = 'demo';

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    _input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const supported = ['store.match_invoices', 'store.get_orders', 'store.get_user'];
    if (!supported.includes(action)) {
      return { valid: false, error: `Unsupported action "${action}" for internal Store.` };
    }
    return { valid: true };
  }

  public async execute(
    action: string,
    _input: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<ConnectorResult> {
    if (action === 'store.match_invoices') {
      const matched = [
        { invoice_id: 'inv_101', stripe_charge_id: 'ch_1', amount: 4900, status: 'reconciled' },
        { invoice_id: 'inv_102', stripe_charge_id: 'ch_2', amount: 9900, status: 'reconciled' },
        { invoice_id: 'inv_103', stripe_charge_id: 'ch_3', amount: 15000, status: 'reconciled' },
        { invoice_id: 'inv_104', stripe_charge_id: 'ch_4', amount: 2500, status: 'reconciled' },
      ];

      return {
        success: true,
        data: {
          matched_count: matched.length,
          unmatched_count: 0,
          discrepancy_amount: 0,
          items: matched,
          reconciliation_hash: 'sha256_reconciled_clean_batch_01',
        },
        message: `100% of Stripe transactions matched against store invoices. Discrepancy: $0.00. [DEMO]`,
        mode: 'demo',
        outputRef: 'reconciliation_result_01',
      };
    }

    if (action === 'store.get_orders') {
      return {
        success: true,
        data: { orders_count: 4, period: 'past_7_days' },
        message: 'Internal store orders retrieved successfully. [DEMO]',
        mode: 'demo',
      };
    }

    if (action === 'store.get_user') {
      return {
        success: true,
        data: { user_id: 'usr_acme_admin', email: 'admin@acme.corp', tier: 'enterprise' },
        message: 'User identity profile verified in store. [DEMO]',
        mode: 'demo',
      };
    }

    throw new Error(`Unhandled action: ${action}`);
  }

  public async verify(
    _action: string,
    result: unknown,
    _expectedOutput: string
  ): Promise<VerificationResult> {
    const data = (result as any)?.data || result;
    return {
      verified: Boolean(data?.matched_count !== undefined || data?.orders_count || data?.user_id),
      confidence: 1.0,
      evidence: { discrepancy: data?.discrepancy_amount ?? 0 },
      message: 'Confirmed: Store records verified against database.',
    };
  }
}
