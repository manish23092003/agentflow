/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';

const authRouter = Router();
const authService = new AuthService();

const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const WalletNonceSchema = z.object({
  address: z.string().min(58, 'Invalid Algorand address').max(58, 'Invalid Algorand address')
});

const WalletVerifySchema = z.object({
  address: z.string().min(58).max(58),
  nonce: z.string().min(1, 'Nonce is required'),
  signature: z.string().min(1, 'Signature is required'),
  network: z.string().optional().default('testnet')
});

function setSessionCookie(res: any, rawToken: string, expiresAt: Date) {
  res.cookie(config.auth.sessionCookieName, rawToken, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: config.env === 'production' ? 'none' : 'lax',
    expires: expiresAt,
    path: '/'
  });
}

/**
 * POST /api/v1/auth/signup
 */
authRouter.post('/signup', async (req, res) => {
  try {
    const data = SignupSchema.parse(req.body);
    const user = await authService.registerUser(data.name, data.email, data.password);
    const { rawToken, expiresAt } = await authService.createSession(user.id);

    setSessionCookie(res, rawToken, expiresAt);

    const profile = await authService.getUserProfile(user.id);
    res.status(201).json({
      success: true,
      user: profile,
      wallets: []
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SIGNUP_FAILED',
        message: error.message || 'Failed to create account'
      }
    });
  }
});

/**
 * POST /api/v1/auth/login
 */
authRouter.post('/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await authService.loginUser(data.email, data.password);
    const { rawToken, expiresAt } = await authService.createSession(user.id);

    setSessionCookie(res, rawToken, expiresAt);

    const profile = await authService.getUserProfile(user.id);
    res.json({
      success: true,
      user: profile,
      wallets: profile?.wallets || []
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: error.message || 'Invalid email or password'
      }
    });
  }
});

/**
 * GET /api/v1/auth/google
 */
authRouter.get('/google', (req, res) => {
  try {
    const url = authService.getGoogleAuthUrl();
    res.redirect(url);
  } catch {
    res.redirect(`${config.frontendUrl}/login?error=oauth_configuration`);
  }
});

/**
 * GET /api/v1/auth/google/callback
 */
authRouter.get('/google/callback', async (req, res) => {
  try {
    const error = req.query.error as string;
    if (error === 'access_denied') {
      res.redirect(`${config.frontendUrl}/login?error=oauth_denied`);
      return;
    }
    if (error) {
      res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
      return;
    }

    const user = await authService.handleGoogleCallback(code);
    const { rawToken, expiresAt } = await authService.createSession(user.id);

    setSessionCookie(res, rawToken, expiresAt);

    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch {
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
  }
});

/**
 * GET /api/v1/auth/me
 */
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await authService.getUserProfile(req.user!.id);
    if (!profile) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      user: profile,
      wallets: profile.wallets || []
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_ERROR',
        message: error.message || 'Failed to fetch user profile'
      }
    });
  }
});

/**
 * POST /api/v1/auth/wallet/nonce
 */
authRouter.post('/wallet/nonce', requireAuth, async (req, res) => {
  try {
    const data = WalletNonceSchema.parse(req.body);
    const challenge = await authService.createWalletChallenge(req.user!.id, data.address);

    res.json({
      success: true,
      nonce: challenge.nonce,
      message: challenge.message,
      expiresAt: challenge.expiresAt
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'CHALLENGE_FAILED',
        message: error.message || 'Failed to generate wallet verification challenge'
      }
    });
  }
});

/**
 * POST /api/v1/auth/wallet/verify
 */
authRouter.post('/wallet/verify', requireAuth, async (req, res) => {
  try {
    const data = WalletVerifySchema.parse(req.body);
    const wallet = await authService.verifyWalletChallenge(
      req.user!.id,
      data.address,
      data.nonce,
      data.signature,
      data.network
    );

    res.json({
      success: true,
      wallet
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VERIFICATION_FAILED',
        message: error.message || 'Cryptographic wallet signature verification failed'
      }
    });
  }
});

/**
 * POST /api/v1/auth/logout
 */
authRouter.post('/logout', async (req, res) => {
  try {
    let token: string | undefined = req.cookies?.[config.auth.sessionCookieName];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7).trim();
    }

    if (token) {
      await authService.revokeSession(token);
    }

    res.clearCookie(config.auth.sessionCookieName, {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: error.message || 'Failed to logout'
      }
    });
  }
});

export default authRouter;
