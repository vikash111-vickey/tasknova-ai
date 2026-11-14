import { ToolConnector } from './types';
import { DemoGmailConnector } from './demoGmail';
import { DemoDriveConnector } from './demoDrive';
import { DemoCalendarConnector } from './demoCalendar';
import { DocumentEngineConnector } from './documentEngine';
import { WebToolsConnector } from './webTools';
import { DemoStripeConnector } from './demoStripe';
import { DemoStoreConnector } from './demoStoreConnector';
import { DemoVerifierConnector } from './demoVerifier';
import { DemoSlackConnector } from './demoSlack';
import { DemoApprovalConnector } from './demoApproval';

export * from './types';
export * from './demoStore';

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors = new Map<string, ToolConnector>();

  private constructor() {
    this.registerDefaults();
  }

  public static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  private registerDefaults(): void {
    const gmail = new DemoGmailConnector();
    const drive = new DemoDriveConnector();
    const calendar = new DemoCalendarConnector();
    const documentEngine = new DocumentEngineConnector();
    const web = new WebToolsConnector();
    const stripe = new DemoStripeConnector();
    const store = new DemoStoreConnector();
    const verifier = new DemoVerifierConnector();
    const slack = new DemoSlackConnector();
    const approval = new DemoApprovalConnector();

    this.connectors.set('gmail', gmail);
    this.connectors.set('email', gmail);
    this.connectors.set('drive', drive);
    this.connectors.set('calendar', calendar);
    this.connectors.set('reports', documentEngine);
    this.connectors.set('document', documentEngine);
    this.connectors.set('web', web);
    this.connectors.set('stripe', stripe);
    this.connectors.set('store', store);
    this.connectors.set('verifier', verifier);
    this.connectors.set('slack', slack);
    this.connectors.set('approval', approval);
  }

  public getConnector(toolName: string): ToolConnector | undefined {
    return this.connectors.get(toolName.toLowerCase());
  }

  public registerConnector(toolName: string, connector: ToolConnector): void {
    this.connectors.set(toolName.toLowerCase(), connector);
  }

  public getAllConnectors(): ToolConnector[] {
    const unique = new Set(this.connectors.values());
    return Array.from(unique);
  }
}
