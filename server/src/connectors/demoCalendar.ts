import { v4 as uuidv4 } from 'uuid';
import {
  ToolConnector,
  ExecutionContext,
  ConnectorResult,
  VerificationResult,
} from './types';
import { DemoStore } from './demoStore';

export class DemoCalendarConnector implements ToolConnector {
  public name = 'calendar';
  public mode: 'demo' = 'demo';
  private demoStore = DemoStore.getInstance();

  public async isConnected(): Promise<boolean> {
    return true;
  }

  public async validateAction(
    action: string,
    _input: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const supported = [
      'calendar.check_availability',
      'calendar.create_event',
      'calendar.get_event',
    ];
    if (!supported.includes(action)) {
      return { valid: false, error: `Unsupported action "${action}" for Calendar connector.` };
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

    if (action === 'calendar.check_availability') {
      return {
        success: true,
        data: {
          available: true,
          slots: ['10:00 AM - 11:00 AM', '02:00 PM - 03:00 PM', '04:30 PM - 05:30 PM'],
          timezone: 'UTC',
        },
        message: 'Calendar availability confirmed. [DEMO]',
        mode: 'demo',
      };
    }

    if (action === 'calendar.create_event') {
      const title = String(input.title || 'Platform Review');
      const description = String(input.description || 'Weekly sync');
      const startTime = String(input.startTime || new Date().toISOString());
      const endTime = String(input.endTime || new Date(Date.now() + 3600000).toISOString());
      const attendees = Array.isArray(input.attendees) ? input.attendees.map(String) : [];

      const newEvent = {
        id: `cal_${uuidv4()}`,
        title,
        description,
        startTime,
        endTime,
        attendees,
        status: 'confirmed' as const,
      };

      this.demoStore.calendarEvents.push(newEvent);

      return {
        success: true,
        data: newEvent,
        message: `Calendar event "${title}" booked in demo calendar. [DEMO]`,
        mode: 'demo',
        outputRef: newEvent.id,
      };
    }

    if (action === 'calendar.get_event') {
      const eventId = String(input.eventId || input.id || '');
      const event = this.demoStore.calendarEvents.find((e) => e.id === eventId);
      if (!event) throw new Error(`Calendar event "${eventId}" not found.`);

      return {
        success: true,
        data: event,
        message: `Calendar event "${event.title}" details retrieved. [DEMO]`,
        mode: 'demo',
      };
    }

    throw new Error(`Unhandled action: ${action}`);
  }

  public async verify(
    action: string,
    result: unknown,
    _expectedOutput: string
  ): Promise<VerificationResult> {
    if (action === 'calendar.create_event' || action === 'calendar.get_event') {
      const data = (result as any)?.data || result;
      const eventId = data?.id || (result as any)?.outputRef;
      const event = this.demoStore.calendarEvents.find((e) => e.id === eventId);
      if (event && event.title && event.startTime) {
        return {
          verified: true,
          confidence: 1.0,
          evidence: {
            eventId: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
          },
          message: `Confirmed: Calendar event "${event.title}" verified at ${event.startTime} in Demo Calendar.`,
        };
      }
      return { verified: false, confidence: 0, evidence: null, message: 'Calendar event not found or missing title/time.' };
    }

    return { verified: true, confidence: 1.0, evidence: { action } };
  }
}
