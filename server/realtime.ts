import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
  userId?: string;
  branch?: string;
}

class RealtimeHub {
  private clients: Set<Client> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Keep-alive heartbeat every 15s for Cloud Run / proxy stability
    this.pingInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  public registerClient(res: Response, userId?: string, branch?: string): string {
    const id = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const client: Client = { id, res, userId, branch };
    this.clients.add(client);

    // Initial connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id, connectedAt: new Date().toISOString() })}\n\n`);

    return id;
  }

  public removeClient(id: string) {
    for (const client of this.clients) {
      if (client.id === id) {
        this.clients.delete(client);
        break;
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public broadcast(event: string, payload: any) {
    const dataStr = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(dataStr);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  private sendHeartbeat() {
    for (const client of this.clients) {
      try {
        client.res.write(':keepalive\n\n');
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }
}

export const realtimeHub = new RealtimeHub();
