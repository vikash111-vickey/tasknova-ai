import { Response } from 'express';
import { ExecutionEvent } from '../types/models';
import { getRepository } from '../repository';

interface SSEClient {
  id: string;
  res: Response;
  taskId?: string; // If undefined, client is listening to global events
  userId: string;
}

export class SSEBroker {
  private static instance: SSEBroker;
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Send keepalive comment every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  public static getInstance(): SSEBroker {
    if (!SSEBroker.instance) {
      SSEBroker.instance = new SSEBroker();
    }
    return SSEBroker.instance;
  }

  public addClient(client: SSEClient, lastEventId?: string): void {
    this.clients.set(client.id, client);

    // Initial headers for SSE
    client.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connected comment
    client.res.write(`: connected to stream (${client.taskId ? `task:${client.taskId}` : 'global'})\n\n`);

    // Replay missed events if client supplied lastEventId
    if (lastEventId) {
      this.replayEvents(client, lastEventId);
    }

    client.res.on('close', () => {
      this.removeClient(client.id);
    });
  }

  public removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  private async replayEvents(client: SSEClient, lastEventId: string): Promise<void> {
    const repo = getRepository();
    try {
      const missedEvents = client.taskId
        ? await repo.getExecutionEvents(client.taskId, lastEventId)
        : await repo.getGlobalEvents(client.userId, lastEventId);

      for (const event of missedEvents) {
        this.sendEventToClient(client, event);
      }
    } catch (err) {
      console.warn(`[SSEBroker] Failed to replay events for client ${client.id}:`, err);
    }
  }

  public async broadcastEvent(event: ExecutionEvent): Promise<void> {
    // Note: Event must be persisted by the caller before broadcasting (as per spec)
    for (const client of this.clients.values()) {
      // Filter by authorization: only broadcast if the client is authorized for this user
      if (client.userId !== event.userId) {
        continue;
      }

      // If client is subscribed to a specific task, only send if matches
      if (client.taskId && client.taskId !== event.taskId) {
        continue;
      }

      this.sendEventToClient(client, event);
    }
  }

  private sendEventToClient(client: SSEClient, event: ExecutionEvent): void {
    try {
      client.res.write(`id: ${event.id}\n`);
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      console.warn(`[SSEBroker] Error writing to client ${client.id}:`, err);
      this.removeClient(client.id);
    }
  }

  private sendHeartbeat(): void {
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`: ping ${new Date().toISOString()}\n\n`);
      } catch {
        this.clients.delete(id);
      }
    }
  }

  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clients.clear();
  }
}
