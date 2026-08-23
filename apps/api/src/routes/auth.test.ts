import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from './auth.js';

const { mockGetGoogleAuthUrl, mockHandleGoogleCallback, mockCreateSession } = vi.hoisted(() => {
  return {
    mockGetGoogleAuthUrl: vi.fn(),
    mockHandleGoogleCallback: vi.fn(),
    mockCreateSession: vi.fn()
  };
});

vi.mock('../services/AuthService.js', () => {
  return {
    AuthService: vi.fn().mockImplementation(() => ({
      getGoogleAuthUrl: mockGetGoogleAuthUrl,
      handleGoogleCallback: mockHandleGoogleCallback,
      createSession: mockCreateSession,
      revokeSession: vi.fn(),
      getUserProfile: vi.fn(),
    }))
  };
});

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);

describe('Auth Routes - Google OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/auth/google', () => {
    it('redirects to the Google auth URL', async () => {
      mockGetGoogleAuthUrl.mockReturnValue('https://google.com/oauth');
      const response = await request(app).get('/api/v1/auth/google');
      expect(response.status).toBe(302);
      expect(response.header.location).toBe('https://google.com/oauth');
    });

    it('redirects to login with error on failure', async () => {
      mockGetGoogleAuthUrl.mockImplementation(() => {
        throw new Error('Config missing');
      });
      const response = await request(app).get('/api/v1/auth/google');
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/login?error=oauth_configuration');
    });
  });

  describe('GET /api/v1/auth/google/callback', () => {
    it('redirects to login if error query param is present', async () => {
      const response = await request(app).get('/api/v1/auth/google/callback?error=access_denied');
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/login?error=oauth_denied');
    });

    it('redirects to login if code is missing', async () => {
      const response = await request(app).get('/api/v1/auth/google/callback');
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/login?error=oauth_failed');
    });

    it('handles successful callback, creates session, and redirects to dashboard', async () => {
      mockHandleGoogleCallback.mockResolvedValue({ id: 'user-123' } as unknown as import('@prisma/client').User);
      mockCreateSession.mockResolvedValue({
        rawToken: 'mock-token',
        expiresAt: new Date(Date.now() + 3600000)
      });

      const response = await request(app).get('/api/v1/auth/google/callback?code=mock-code');
      
      expect(mockHandleGoogleCallback).toHaveBeenCalledWith('mock-code');
      expect(mockCreateSession).toHaveBeenCalledWith('user-123');
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/dashboard');
      expect(response.header['set-cookie'][0]).toContain('agentflow_session=mock-token');
      expect(response.header['set-cookie'][0]).toContain('HttpOnly');
    });

    it('redirects to login on callback processing failure', async () => {
      mockHandleGoogleCallback.mockRejectedValue(new Error('Failed'));

      const response = await request(app).get('/api/v1/auth/google/callback?code=mock-code');
      
      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/login?error=oauth_failed');
    });
  });
});
