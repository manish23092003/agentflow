import { randomUUID } from 'node:crypto';
import type { ModelMessage } from 'ai';

export interface SessionData {
  id: string;
  messages: ModelMessage[];
  createdAt: number;
}

export class MemoryStore {
  private sessions = new Map<string, SessionData>();

  createSession(): string {
    const id = randomUUID();
    this.sessions.set(id, {
      id,
      messages: [],
      createdAt: Date.now(),
    });
    return id;
  }

  appendMessage(sessionId: string, message: ModelMessage) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    session.messages.push(message);
  }

  getHistory(sessionId: string): ModelMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    return [...session.messages];
  }

  clearSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

// Global in-memory instance for Phase 4 prototyping.
export const memoryStore = new MemoryStore();
