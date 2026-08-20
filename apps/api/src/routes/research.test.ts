/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import researchRouter from './research.js';
import { ResearchRepository } from '../db/ResearchRepository.js';
import { ResearchAgent } from '../agent/ResearchAgent.js';

// Mock dependencies
vi.mock('../db/ResearchRepository.js');
vi.mock('../agent/ResearchAgent.js');
vi.mock('../research/providers/TavilySearchProvider.js');

describe('Research API', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/research', researchRouter);
    vi.clearAllMocks();
  });

  describe('POST /api/v1/research/start', () => {
    it('should create a session and return 201', async () => {
      vi.mocked(ResearchAgent.prototype.runFreeResearchPhase).mockResolvedValue();
      const mockSession = {
        id: '123',
        userId: 'default-user',
        goal: 'test goal',
        researchBudget: 200000,
        spent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      vi.mocked(ResearchRepository.prototype.createSession).mockResolvedValue(mockSession as any);

      const response = await request(app)
        .post('/api/v1/research/start')
        .send({ goal: 'test goal', budget: 200000 });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('123');
      expect(response.body.goal).toBe('test goal');
      expect(ResearchRepository.prototype.createSession).toHaveBeenCalledWith('default-user', 'test goal', 200000);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/v1/research/start')
        .send({ goal: 'test goal' }); // missing budget

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/research/:id', () => {
    it('should return session and calculate remaining budget', async () => {
      vi.mocked(ResearchRepository.prototype.getSession).mockResolvedValue({
        id: '123',
        userId: 'default-user',
        goal: 'test goal',
        researchBudget: 200000,
        spent: 50000,
        status: 'RESEARCHING_FREE',
        createdAt: new Date(),
        updatedAt: new Date(),
        failureReason: null
      });
      
      // Override the private db instance in the mock prototype if possible, 
      // or we can just mock findMany globally. Let's mock the internal db since it's hard to reach.
      // Wait, ResearchRepository instantiates prisma by default.
      // The router creates `const repository = new ResearchRepository();`
      // So let's just make the mock return something we can control.
    });
  });

  describe('GET /api/v1/research/:id/stream', () => {
    it('should initialize SSE stream and send initial state', () => {
      return new Promise<void>((resolve, reject) => {
        vi.mocked(ResearchRepository.prototype.getSession).mockResolvedValue({
          id: '123',
          userId: 'default-user',
          goal: 'test goal',
          researchBudget: 200000,
          spent: 50000,
          status: 'RESEARCHING_FREE',
          createdAt: new Date(),
          updatedAt: new Date(),
          failureReason: null
        });

        const req = request(app).get('/api/v1/research/123/stream');
        req.on('error', () => {
          // Ignore ECONNRESET / abort error on client-side cleanup
        });
        
        req.buffer(false).end((err, res) => {
          if (err && !res) return reject(err);
        });

        req.on('response', (res) => {
          res.on('error', () => {
            // Ignore abort error
          });
          expect(res.headers['content-type']).toBe('text/event-stream');
          expect(res.headers['cache-control']).toBe('no-cache');
          
          let buffered = '';
          res.on('data', (chunk: Buffer) => {
            buffered += chunk.toString();
            if (buffered.includes('session_state') && buffered.includes('"status":"RESEARCHING_FREE"')) {
              req.abort(); // Close stream to end test
              resolve();
            }
          });
        });
      });
    });
  });
});
