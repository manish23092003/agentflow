/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { UserProfile, UserWallet } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  wallets: UserWallet[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  linkWalletWithSignature: (
    address: string,
    signBytesFn: (bytes: Uint8Array) => Promise<Uint8Array | { result: Uint8Array }>
  ) => Promise<UserWallet>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setWallets(res.wallets || []);
      } else {
        setUser(null);
        setWallets([]);
      }
    } catch {
      setUser(null);
      setWallets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    if (res.success && res.user) {
      setUser(res.user);
      setWallets(res.wallets || []);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await api.auth.signup({ name, email, password });
    if (res.success && res.user) {
      setUser(res.user);
      setWallets(res.wallets || []);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await api.auth.googleAuth(credential);
    if (res.success && res.user) {
      setUser(res.user);
      setWallets(res.wallets || []);
    }
  };

  const linkWalletWithSignature = async (
    address: string,
    signBytesFn: (bytes: Uint8Array) => Promise<Uint8Array | { result: Uint8Array }>
  ): Promise<UserWallet> => {
    if (!user) {
      throw new Error('You must be logged in to link a wallet');
    }

    // 1. Get single-use nonce from server
    const nonceRes = await api.auth.getWalletNonce(address);
    if (!nonceRes.success || !nonceRes.nonce || !nonceRes.message) {
      throw new Error(nonceRes.error?.message || 'Failed to request wallet verification challenge');
    }

    // 2. Prompt wallet to sign message bytes
    const messageBytes = new TextEncoder().encode(nonceRes.message);
    const signResult = await signBytesFn(messageBytes);
    
    // Normalize Uint8Array or Pera result object
    const rawSignatureBytes: Uint8Array = 
      signResult instanceof Uint8Array ? signResult : (signResult as any).result || signResult;

    // Convert to base64
    let binary = '';
    const len = rawSignatureBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(rawSignatureBytes[i]);
    }
    const signatureBase64 = btoa(binary);

    // 3. Submit signature to server for single-use verification
    const verifyRes = await api.auth.verifyWallet({
      address,
      nonce: nonceRes.nonce,
      signature: signatureBase64,
      network: 'testnet'
    });

    if (!verifyRes.success || !verifyRes.wallet) {
      throw new Error(verifyRes.error?.message || 'Cryptographic wallet signature verification failed');
    }

    // Update local state
    setWallets(prev => {
      const filtered = prev.filter(w => w.address !== address);
      return [verifyRes.wallet!, ...filtered];
    });

    return verifyRes.wallet;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setWallets([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallets,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        linkWalletWithSignature,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

