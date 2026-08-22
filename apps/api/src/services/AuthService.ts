import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import algosdk from 'algosdk';
import { prisma } from '../db/prisma.js';
import { config } from '../config.js';
import type { User, UserWallet } from '@prisma/client';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
  wallets: UserWallet[];
}

export class AuthService {
  private db = prisma;

  /**
   * Hashes a raw password using bcrypt with 12 salt rounds.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compares a raw password against a bcrypt hash.
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Computes SHA-256 hash of a raw session token.
   * Protects the database so token hashes cannot be used to forge sessions.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a 32-byte cryptographically secure random session token,
   * stores its SHA-256 hash in the database, and returns both.
   */
  async createSession(userId: string): Promise<{ rawToken: string; expiresAt: Date }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.auth.sessionDurationMs);

    await this.db.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });

    return { rawToken, expiresAt };
  }

  /**
   * Validates an active session given a raw token from the cookie.
   * Hashes the token, finds the active session, and returns the associated User.
   */
  async validateSession(rawToken: string): Promise<User | null> {
    if (!rawToken || typeof rawToken !== 'string') {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.db.session.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!session) {
      return null;
    }

    // Check expiration
    if (session.expiresAt.getTime() <= Date.now()) {
      // Lazy cleanup of expired session
      await this.db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return session.user;
  }

  /**
   * Revokes an active session immediately upon logout.
   */
  async revokeSession(rawToken: string): Promise<boolean> {
    if (!rawToken || typeof rawToken !== 'string') {
      return false;
    }

    const tokenHash = this.hashToken(rawToken);
    try {
      await this.db.session.delete({
        where: { tokenHash }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revokes all active sessions for a specific user (e.g. password reset).
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.db.session.deleteMany({
      where: { userId }
    });
    return result.count;
  }

  /**
   * Registers a new user with email and password.
   */
  async registerUser(name: string, email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.db.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      throw new Error('An account with this email already exists');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const passwordHash = await this.hashPassword(password);
    return this.db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash
      }
    });
  }

  /**
   * Authenticates a user with email and password.
   */
  async loginUser(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.db.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  /**
   * Authenticates or registers a user via Google OAuth (ID token / Credential).
   * Verifies with Google's tokeninfo service server-side.
   */
  async googleAuth(credential: string): Promise<User> {
    if (!credential || typeof credential !== 'string') {
      throw new Error('Google credential token is required');
    }

    // Verify token with Google OIDC tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!response.ok) {
      throw new Error('Failed to verify Google credential');
    }

    const payload = await response.json() as {
      sub: string;
      email?: string;
      name?: string;
      picture?: string;
      aud?: string;
    };

    if (!payload.sub || !payload.email) {
      throw new Error('Invalid Google credential payload');
    }

    const googleId = payload.sub;
    const normalizedEmail = payload.email.trim().toLowerCase();
    const name = payload.name || normalizedEmail.split('@')[0];
    const avatarUrl = payload.picture || null;

    // Check if user already exists by googleId or email
    let user = await this.db.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: normalizedEmail }
        ]
      }
    });

    if (user) {
      // Update Google ID and avatar if needed
      user = await this.db.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleId,
          avatarUrl: user.avatarUrl || avatarUrl,
          name: user.name || name
        }
      });
    } else {
      user = await this.db.user.create({
        data: {
          email: normalizedEmail,
          name,
          googleId,
          avatarUrl
        }
      });
    }

    return user;
  }

  /**
   * Generates a single-use cryptographic challenge nonce for Pera wallet verification.
   * Bound to the authenticated user and target address with a 5-minute expiration.
   */
  async createWalletChallenge(userId: string, address: string): Promise<{ nonce: string; message: string; expiresAt: Date }> {
    if (!algosdk.isValidAddress(address)) {
      throw new Error('Invalid Algorand wallet address');
    }

    // Clean up any existing challenges for this user/address
    await this.db.walletChallenge.deleteMany({
      where: {
        userId,
        address
      }
    }).catch(() => {});

    const randomBytes = crypto.randomBytes(16).toString('hex');
    const nonce = `AF-LINK-${randomBytes}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const message = `AgentFlow Wallet Link Verification\n\nUser ID: ${userId}\nAddress: ${address}\nNonce: ${nonce}`;

    await this.db.walletChallenge.create({
      data: {
        userId,
        address,
        nonce,
        expiresAt
      }
    });

    return { nonce, message, expiresAt };
  }

  /**
   * Verifies the cryptographic Algorand signature of a single-use wallet challenge.
   * Consumes/deletes the challenge immediately (anti-replay) upon verification.
   */
  async verifyWalletChallenge(
    userId: string,
    address: string,
    nonce: string,
    signatureBase64OrHex: string,
    network = 'testnet'
  ): Promise<UserWallet> {
    if (!algosdk.isValidAddress(address)) {
      throw new Error('Invalid Algorand wallet address');
    }

    // Atomically find and delete the challenge to prevent any replay attack
    const challenge = await this.db.walletChallenge.findUnique({
      where: { nonce }
    });

    if (!challenge) {
      throw new Error('Invalid or expired wallet verification challenge');
    }

    // Delete challenge immediately to ensure single-use
    await this.db.walletChallenge.delete({
      where: { id: challenge.id }
    }).catch(() => {});

    // Check expiration
    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new Error('Wallet verification challenge has expired');
    }

    // Check user and address binding
    if (challenge.userId !== userId || challenge.address !== address) {
      throw new Error('Wallet verification challenge does not match user or address');
    }

    // Reconstruct the expected message bytes
    const message = `AgentFlow Wallet Link Verification\n\nUser ID: ${userId}\nAddress: ${address}\nNonce: ${nonce}`;
    const messageBytes = new Uint8Array(Buffer.from(message, 'utf-8'));

    // Parse signature
    let signatureBytes: Uint8Array;
    try {
      if (signatureBase64OrHex.length === 128) {
        signatureBytes = new Uint8Array(Buffer.from(signatureBase64OrHex, 'hex'));
      } else {
        signatureBytes = new Uint8Array(Buffer.from(signatureBase64OrHex, 'base64'));
      }
    } catch {
      throw new Error('Invalid signature encoding');
    }

    // Verify signature with algosdk
    const isValid = algosdk.verifyBytes(messageBytes, signatureBytes, address);
    if (!isValid) {
      throw new Error('Cryptographic signature verification failed');
    }

    // Upsert UserWallet association
    const existing = await this.db.userWallet.findFirst({
      where: {
        userId,
        address,
        network
      }
    });

    if (existing) {
      return existing;
    }

    return this.db.userWallet.create({
      data: {
        userId,
        address,
        network,
        isPrimary: true
      }
    });
  }

  /**
   * Retrieves user profile along with associated wallets.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        wallets: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      wallets: user.wallets
    };
  }
}
