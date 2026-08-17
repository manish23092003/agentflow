import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PaymentRecord {
  id: string;
  timestamp: string;
  resource: string;
  amount: number;
  asset: string;
  receiver: string;
  network: string;
  decision: string;
  transactionId?: string;
  status: PaymentStatus;
  agentAction: string;
}

export interface PaymentRepository {
  createPayment(record: Omit<PaymentRecord, 'id' | 'timestamp'>): Promise<PaymentRecord>;
  getPayments(): Promise<PaymentRecord[]>;
  updateStatus(id: string, updates: Partial<Pick<PaymentRecord, 'status' | 'transactionId'>>): Promise<void>;
}

export class JsonPaymentRepository implements PaymentRepository {
  private filePath: string;

  constructor(filePath?: string) {
    // Default to apps/api/data/payments.json
    this.filePath = filePath ?? path.join(process.cwd(), 'data', 'payments.json');
  }

  private async readData(): Promise<PaymentRecord[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as PaymentRecord[];
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ENOENT') {
        return [];
      }
      throw e;
    }
  }

  private async writeData(data: PaymentRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async createPayment(record: Omit<PaymentRecord, 'id' | 'timestamp'>): Promise<PaymentRecord> {
    const data = await this.readData();
    const newRecord: PaymentRecord = {
      ...record,
      id: randomUUID(),
      timestamp: new Date().toISOString()
    };
    data.push(newRecord);
    await this.writeData(data);
    return newRecord;
  }

  async getPayments(): Promise<PaymentRecord[]> {
    return this.readData();
  }

  async updateStatus(id: string, updates: Partial<Pick<PaymentRecord, 'status' | 'transactionId'>>): Promise<void> {
    const data = await this.readData();
    const index = data.findIndex(r => r.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      await this.writeData(data);
    }
  }
}
