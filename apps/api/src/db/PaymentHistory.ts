import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from './prisma.js';

export type PaymentStatus = 'PENDING' | 'PENDING_APPROVAL' | 'SUCCESS' | 'FAILED';

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
  researchSessionId?: string;
}

export interface ApprovalRequest {
  id: string;
  paymentRecordId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  resourceUrl: string;
  amount: number;
  asset: string;
  network: string;
  payTo: string;
  reason: string;
  requestedAt: string;
  expiresAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  resolvedBy?: string;
  resolutionReason?: string;
}

export interface PaymentRepository {
  createPayment(record: Omit<PaymentRecord, 'id' | 'timestamp'>): Promise<PaymentRecord>;
  getPayments(): Promise<PaymentRecord[]>;
  getPaymentById(id: string): Promise<PaymentRecord | null>;
  updateStatus(id: string, updates: Partial<Pick<PaymentRecord, 'status' | 'transactionId'>>): Promise<void>;
  updatePayment(id: string, updates: Partial<PaymentRecord>): Promise<void>;
  
  createApprovalRequest(data: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<ApprovalRequest>;
  getApprovalRequest(id: string): Promise<ApprovalRequest | null>;
  updateApprovalRequest(id: string, updates: Partial<ApprovalRequest>): Promise<void>;
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
    return this.updatePayment(id, updates);
  }

  async updatePayment(id: string, updates: Partial<PaymentRecord>): Promise<void> {
    const data = await this.readData();
    const index = data.findIndex(r => r.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      await this.writeData(data);
    }
  }
  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const data = await this.readData();
    return data.find(r => r.id === id) || null;
  }

  async createApprovalRequest(_data: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<ApprovalRequest> {
    throw new Error('Approval requests not supported in JSON repo');
  }

  async getApprovalRequest(_id: string): Promise<ApprovalRequest | null> {
    throw new Error('Approval requests not supported in JSON repo');
  }

  async updateApprovalRequest(_id: string, _updates: Partial<ApprovalRequest>): Promise<void> {
    throw new Error('Approval requests not supported in JSON repo');
  }
}

export class PrismaPaymentRepository implements PaymentRepository {
  async createPayment(record: Omit<PaymentRecord, 'id' | 'timestamp'>): Promise<PaymentRecord> {
    const dbRecord = await prisma.paymentRecord.create({
      data: {
        amount: record.amount,
        asset: record.asset,
        receiver: record.receiver,
        network: record.network,
        decision: record.decision,
        status: record.status,
        agentAction: record.agentAction,
        transactionId: record.transactionId,
        researchSessionId: record.researchSessionId
      }
    });

    return {
      id: dbRecord.id,
      timestamp: dbRecord.createdAt.toISOString(),
      resource: record.resource,
      amount: dbRecord.amount,
      asset: dbRecord.asset,
      receiver: dbRecord.receiver,
      network: dbRecord.network,
      decision: dbRecord.decision,
      status: dbRecord.status as PaymentStatus,
      agentAction: dbRecord.agentAction,
      transactionId: dbRecord.transactionId ?? undefined,
      researchSessionId: dbRecord.researchSessionId ?? undefined
    };
  }

  async getPayments(): Promise<PaymentRecord[]> {
    const dbRecords = await prisma.paymentRecord.findMany();
    return dbRecords.map(dbRecord => ({
      id: dbRecord.id,
      timestamp: dbRecord.createdAt.toISOString(),
      resource: '', // Resource was not in the Prisma schema as requested by user in model description!
      amount: dbRecord.amount,
      asset: dbRecord.asset,
      receiver: dbRecord.receiver,
      network: dbRecord.network,
      decision: dbRecord.decision,
      status: dbRecord.status as PaymentStatus,
      agentAction: dbRecord.agentAction,
      transactionId: dbRecord.transactionId ?? undefined,
      researchSessionId: dbRecord.researchSessionId ?? undefined
    }));
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const dbRecord = await prisma.paymentRecord.findUnique({ where: { id } });
    if (!dbRecord) return null;
    return {
      id: dbRecord.id,
      timestamp: dbRecord.createdAt.toISOString(),
      resource: '', 
      amount: dbRecord.amount,
      asset: dbRecord.asset,
      receiver: dbRecord.receiver,
      network: dbRecord.network,
      decision: dbRecord.decision,
      status: dbRecord.status as PaymentStatus,
      agentAction: dbRecord.agentAction,
      transactionId: dbRecord.transactionId ?? undefined,
      researchSessionId: dbRecord.researchSessionId ?? undefined
    };
  }

  async updateStatus(id: string, updates: Partial<Pick<PaymentRecord, 'status' | 'transactionId'>>): Promise<void> {
    return this.updatePayment(id, updates);
  }

  async updatePayment(id: string, updates: Partial<PaymentRecord>): Promise<void> {
    await prisma.paymentRecord.update({
      where: { id },
      data: {
        status: updates.status,
        transactionId: updates.transactionId,
        researchSessionId: updates.researchSessionId
      }
    });
  }

  async createApprovalRequest(data: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<ApprovalRequest> {
    const dbRecord = await prisma.approvalRequest.create({
      data: {
        paymentRecordId: data.paymentRecordId,
        status: data.status,
        resourceUrl: data.resourceUrl,
        amount: data.amount,
        asset: data.asset,
        network: data.network,
        payTo: data.payTo,
        reason: data.reason,
        expiresAt: new Date(data.expiresAt)
      }
    });
    return this.mapApproval(dbRecord);
  }

  async getApprovalRequest(id: string): Promise<ApprovalRequest | null> {
    const dbRecord = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!dbRecord) return null;
    return this.mapApproval(dbRecord);
  }

  async updateApprovalRequest(id: string, updates: Partial<ApprovalRequest>): Promise<void> {
    await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: updates.status,
        approvedAt: updates.approvedAt ? new Date(updates.approvedAt) : undefined,
        rejectedAt: updates.rejectedAt ? new Date(updates.rejectedAt) : undefined,
        resolvedBy: updates.resolvedBy,
        resolutionReason: updates.resolutionReason
      }
    });
  }

  private mapApproval(dbRecord: import('@prisma/client').ApprovalRequest): ApprovalRequest {
    return {
      id: dbRecord.id,
      paymentRecordId: dbRecord.paymentRecordId,
      status: dbRecord.status as ApprovalRequest['status'],
      resourceUrl: dbRecord.resourceUrl,
      amount: dbRecord.amount,
      asset: dbRecord.asset,
      network: dbRecord.network,
      payTo: dbRecord.payTo,
      reason: dbRecord.reason,
      requestedAt: dbRecord.requestedAt.toISOString(),
      expiresAt: dbRecord.expiresAt.toISOString(),
      approvedAt: dbRecord.approvedAt?.toISOString(),
      rejectedAt: dbRecord.rejectedAt?.toISOString(),
      resolvedBy: dbRecord.resolvedBy ?? undefined,
      resolutionReason: dbRecord.resolutionReason ?? undefined
    };
  }
}
