import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService.js';
import { config } from '../config.js';

// Mock dependencies
vi.mock('../db/prisma.js', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

vi.mock('../config.js', () => ({
  config: {
    auth: {
      sessionDurationMs: 3600000,
      googleClientId: 'test-client-id',
      googleClientSecret: 'test-client-secret',
      googleRedirectUri: 'http://localhost/callback'
    }
  }
}));

// Mock google-auth-library
const mockVerifyIdToken = vi.fn();
vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }))
  };
});

describe('AuthService - Google OAuth', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  describe('getGoogleAuthUrl', () => {
    it('returns a valid Google authorization URL', () => {
      const url = authService.getGoogleAuthUrl();
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
    });

    it('throws error if config is missing', () => {
      const originalId = config.auth.googleClientId;
      config.auth.googleClientId = undefined;
      expect(() => authService.getGoogleAuthUrl()).toThrow('Google OAuth configuration is missing');
      config.auth.googleClientId = originalId;
    });
  });

  describe('handleGoogleCallback', () => {
    it('rejects missing code', async () => {
      await expect(authService.handleGoogleCallback('')).rejects.toThrow('Google authorization code is required');
    });

    it('handles token exchange failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue('invalid_grant')
      } as unknown as Response);

      await expect(authService.handleGoogleCallback('test-code')).rejects.toThrow('Failed to exchange Google authorization code: invalid_grant');
    });

    it('handles missing id_token in response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: 'yes' })
      } as unknown as Response);

      await expect(authService.handleGoogleCallback('test-code')).rejects.toThrow('Google token response did not contain an ID token');
    });

    it('rejects unverified email', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id_token: 'fake-id-token' })
      } as unknown as Response);

      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ email_verified: false })
      });

      await expect(authService.handleGoogleCallback('test-code')).rejects.toThrow('Google email is not verified');
    });

    it('creates a new user if one does not exist', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id_token: 'fake-id-token' })
      } as unknown as Response);

      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({ 
          email_verified: true, 
          sub: 'google-123', 
          email: 'test@example.com',
          name: 'Test User',
          picture: 'http://pic.jpg'
        })
      });

      const { prisma } = await import('../db/prisma.js');
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce({ id: 'new-user', email: 'test@example.com' } as unknown as import('@prisma/client').User);

      const user = await authService.handleGoogleCallback('test-code');
      expect(user.id).toBe('new-user');
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          googleId: 'google-123',
          avatarUrl: 'http://pic.jpg'
        }
      }));
    });
  });
});
