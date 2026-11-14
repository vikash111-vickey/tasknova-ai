import crypto from 'crypto';

export interface IntegrationStatusInfo {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  mode: 'demo' | 'live';
  isDemoConnected: boolean;
  isLiveConfigured: boolean;
  actions: string[];
  supportedInDemo: boolean;
  liveCredentialsRequired: string[];
}

export class OAuthService {
  private static instance: OAuthService;
  private encryptionKey: Buffer;

  private constructor() {
    const secret = process.env.ENCRYPTION_KEY || 'tasknova-secure-aes-256-encryption-key-32b';
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  public static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  public encryptToken(plainText: string): { iv: string; encryptedData: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      tag,
    };
  }

  public decryptToken(encryptedData: string, ivHex: string, tagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  public isGoogleLiveConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  public isStripeLiveConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  public getSupportedIntegrations(): IntegrationStatusInfo[] {
    const googleLive = this.isGoogleLiveConfigured();
    const stripeLive = this.isStripeLiveConfigured();

    return [
      {
        id: 'gmail',
        name: 'Gmail',
        type: 'email',
        category: 'Communication',
        description: 'Autonomous customer dispatch, thread retrieval, and verified outbound delivery receipts.',
        mode: googleLive ? 'live' : 'demo',
        isDemoConnected: true,
        isLiveConfigured: googleLive,
        actions: ['email.send', 'email.search', 'email.draft'],
        supportedInDemo: true,
        liveCredentialsRequired: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      },
      {
        id: 'drive',
        name: 'Google Drive',
        type: 'sheets',
        category: 'Storage',
        description: 'Document archival, shared drive synchronization, and cryptographically verified file storage.',
        mode: googleLive ? 'live' : 'demo',
        isDemoConnected: true,
        isLiveConfigured: googleLive,
        actions: ['drive.upload', 'drive.search', 'drive.share'],
        supportedInDemo: true,
        liveCredentialsRequired: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      },
      {
        id: 'calendar',
        name: 'Google Calendar',
        type: 'webhook',
        category: 'Productivity',
        description: 'Autonomous scheduling, meeting invitation dispatch, and conflicts verification.',
        mode: googleLive ? 'live' : 'demo',
        isDemoConnected: true,
        isLiveConfigured: googleLive,
        actions: ['calendar.create_event', 'calendar.check_availability', 'calendar.list_events'],
        supportedInDemo: true,
        liveCredentialsRequired: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      },
      {
        id: 'document',
        name: 'Document & PDF Engine',
        type: 'sheets',
        category: 'Documents',
        description: 'Executive briefing generation, tables rendering, and PDF Proof Certificate synthesis with zero external keys.',
        mode: 'live',
        isDemoConnected: true,
        isLiveConfigured: true,
        actions: ['reports.generate_summary', 'documents.render_pdf'],
        supportedInDemo: true,
        liveCredentialsRequired: [],
      },
      {
        id: 'web',
        name: 'Web Tools & Fetcher',
        type: 'webhook',
        category: 'Developer',
        description: 'REST API webhooks, JSON data extraction, and HTTP health inspection.',
        mode: 'live',
        isDemoConnected: true,
        isLiveConfigured: true,
        actions: ['web.http_request', 'web.scrape_data'],
        supportedInDemo: true,
        liveCredentialsRequired: [],
      },
      {
        id: 'stripe',
        name: 'Stripe Payments',
        type: 'stripe',
        category: 'Finance',
        description: 'Charges inspection, subscription reconciliation, and invoice discrepancy auditing.',
        mode: stripeLive ? 'live' : 'demo',
        isDemoConnected: true,
        isLiveConfigured: stripeLive,
        actions: ['stripe.list_charges', 'stripe.create_invoice', 'stripe.reconcile'],
        supportedInDemo: true,
        liveCredentialsRequired: ['STRIPE_SECRET_KEY'],
      },
    ];
  }

  public getGoogleAuthUrl(redirectUri: string, state: string): { url?: string; error?: string } {
    if (!this.isGoogleLiveConfigured()) {
      return {
        error: 'Live connection requires credentials. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment.',
      };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    };
  }
}
