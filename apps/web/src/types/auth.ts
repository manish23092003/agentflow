export interface UserWallet {
  id: string;
  userId: string;
  address: string;
  network: string;
  label?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  wallets?: UserWallet[];
}

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  wallets?: UserWallet[];
  error?: {
    code: string;
    message: string;
  };
}

export interface WalletNonceResponse {
  success: boolean;
  nonce: string;
  message: string;
  expiresAt: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface WalletVerifyResponse {
  success: boolean;
  wallet?: UserWallet;
  error?: {
    code: string;
    message: string;
  };
}
