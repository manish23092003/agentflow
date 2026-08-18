import type { Prisma, ResearchSession, Citation, PaidResourceRecommendation } from '@prisma/client';
import { prisma } from './prisma.js';
import { ResearchState } from '../agent/ResearchStateMachine.js';

export class ResearchRepository {
  constructor(private db = prisma) {}

  async createSession(userId: string, goal: string, researchBudget: number): Promise<ResearchSession> {
    return this.db.researchSession.create({
      data: {
        userId,
        goal,
        researchBudget,
        status: ResearchState.CREATED,
        spent: 0
      }
    });
  }

  async getSession(id: string): Promise<ResearchSession | null> {
    return this.db.researchSession.findUnique({
      where: { id }
    });
  }

  async updateStatus(id: string, status: ResearchState, failureReason?: string): Promise<ResearchSession> {
    return this.db.researchSession.update({
      where: { id },
      data: { status, failureReason }
    });
  }

  async updateSpent(id: string, amount: number): Promise<ResearchSession> {
    return this.db.researchSession.update({
      where: { id },
      data: {
        spent: { increment: amount }
      }
    });
  }

  async addCitation(data: Prisma.CitationUncheckedCreateInput): Promise<Citation> {
    const existing = await this.db.citation.findFirst({
      where: {
        researchSessionId: data.researchSessionId,
        url: data.url
      }
    });

    if (existing) {
      return existing; // Avoid duplicate citations for the same URL
    }

    return this.db.citation.create({
      data
    });
  }

  async createRecommendation(data: Prisma.PaidResourceRecommendationUncheckedCreateInput): Promise<PaidResourceRecommendation> {
    return this.db.paidResourceRecommendation.create({
      data
    });
  }

  async getCitationsBySessionId(sessionId: string): Promise<Citation[]> {
    return this.db.citation.findMany({
      where: { researchSessionId: sessionId },
      orderBy: { retrievedAt: 'asc' }
    });
  }

  async createGap(data: Prisma.ResearchGapUncheckedCreateInput) {
    return this.db.researchGap.create({
      data
    });
  }
}
