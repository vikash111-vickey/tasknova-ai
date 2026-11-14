import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';

export class DemoStripeConnector implements ToolConnector {
  public name = 'stripe';
  public mode: 'demo' = 'demo';

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    _input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const supported = ['stripe.list_charges', 'stripe.get_payouts'];
    if (!supported.includes(action)) {
      return { valid: false, error: `Unsupported action "${action}" for Stripe.` };
    }
    return { valid: true };
  }

  public async execute(
    action: string,
    input: Record<string, unknown>,
    _context: ExecutionContext
  ): Promise<ConnectorResult> {
    const valid = await this.validateAction(action, input);
    if (!valid.valid) throw new Error(valid.error);

    if (action === 'stripe.list_charges') {
      const charges = [
        { id: 'ch_1', amount: 4900, currency: 'usd', status: 'paid', customer: 'cus_acme_1', created: '2026-11-10T10:00:00Z' },
        { id: 'ch_2', amount: 9900, currency: 'usd', status: 'paid', customer: 'cus_beta_2', created: '2026-11-11T12:00:00Z' },
        { id: 'ch_3', amount: 15000, currency: 'usd', status: 'paid', customer: 'cus_corp_3', created: '2026-11-12T14:00:00Z' },
        { id: 'ch_4', amount: 2500, currency: 'usd', status: 'paid', customer: 'cus_delta_4', created: '2026-11-13T16:00:00Z' },
      ];

      return {
        success: true,
        data: { charges, total_amount: 32300, currency: 'usd', count: charges.length },
        message: `Retrieved ${charges.length} charges totaling $323.00 from Stripe. [DEMO]`,
        mode: 'demo',
        outputRef: 'stripe_charges_batch_1',
      };
    }

    if (action === 'stripe.get_payouts') {
      const payouts = [
        { id: 'po_1', amount: 14800, arrival_date: '2026-11-11T00:00:00Z', status: 'paid' },
        { id: 'po_2', amount: 17500, arrival_date: '2026-11-13T00:00:00Z', status: 'paid' },
      ];
      return {
        success: true,
        data: { payouts, count: payouts.length },
        message: `Retrieved ${payouts.length} Stripe payouts for the past 7 days. [DEMO]`,
        mode: 'demo',
        outputRef: 'stripe_payouts_batch_1',
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
    const hasData = Boolean(data?.charges?.length || data?.payouts?.length);
    return {
      verified: hasData,
      confidence: 1.0,
      evidence: { batch: data?.count || 0 },
      message: 'Confirmed: Stripe processor charges verified.',
    };
  }
}
