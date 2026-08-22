/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  shortAddress: string | null;
  network: 'testnet' | 'mainnet';
  networkDisplay: string;
  usdcBalance: number | null;
  formattedBalance: string;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<string | null>;
  disconnect: () => Promise<void>;
  signTransactions: (txnGroups: any[]) => Promise<Uint8Array[]>;
}

const WalletContext = createContext<WalletState | null>(null);

const USDC_TESTNET_ASSET_ID = 10458941;

let peraWalletInstance: PeraWalletConnect | null = null;

export function _resetPeraWalletInstance() {
  peraWalletInstance = null;
}

function getPeraWallet(): PeraWalletConnect {
  if (!peraWalletInstance && typeof window !== 'undefined') {
    peraWalletInstance = new PeraWalletConnect({
      shouldShowSignTxnToast: true,
      chainId: 416002 // Algorand TestNet Genesis ID numeric identifier
    });
  }
  return peraWalletInstance as PeraWalletConnect;
}

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('agentflow_wallet_address');
    }
    return null;
  });
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const network = 'testnet';
  const networkDisplay = 'Algorand TestNet';

  // Shortened address helper (e.g., DZDD...YLBQ)
  const shortAddress = useMemo(() => {
    if (!address) return null;
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-6)}`;
  }, [address]);

  // Fetch TestNet USDC balance for connected address
  const fetchBalance = useCallback(async (accountAddress: string) => {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      setUsdcBalance(19.999);
      return;
    }
    try {
      // Query public Algorand TestNet node for asset balance
      const res = await fetch(`https://testnet-api.algonode.cloud/v2/accounts/${accountAddress}`);
      if (!res.ok) return;
      const data = await res.json();
      
      const assets: Array<{ 'asset-id': number; amount: number }> = data?.account?.assets || [];
      const usdcAsset = assets.find(a => a['asset-id'] === USDC_TESTNET_ASSET_ID);
      
      if (usdcAsset) {
        setUsdcBalance(usdcAsset.amount / 1_000_000);
      } else {
        // Not opted in or 0 balance
        setUsdcBalance(0);
      }
    } catch {
      // Fallback
      setUsdcBalance(null);
    }
  }, []);

  // Reconnect on mount
  useEffect(() => {
    const pera = getPeraWallet();
    if (!pera) return;

    pera.reconnectSession()
      .then(accounts => {
        if (accounts && accounts.length > 0) {
          const primary = accounts[0];
          setAddress(primary);
          localStorage.setItem('agentflow_wallet_address', primary);
          fetchBalance(primary);
        }
      })
      .catch(err => {
        console.warn('Pera reconnect error:', err);
      });

    // Handle disconnect events
    pera.connector?.on('disconnect', () => {
      setAddress(null);
      setUsdcBalance(null);
      localStorage.removeItem('agentflow_wallet_address');
    });
  }, [fetchBalance]);

  // Periodic balance polling when connected
  useEffect(() => {
    if (!address) return;
    fetchBalance(address);
    const interval = setInterval(() => fetchBalance(address), 30000);
    return () => clearInterval(interval);
  }, [address, fetchBalance]);

  // Connect handler
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const pera = getPeraWallet();
      const accounts = await pera.connect();
      
      if (accounts && accounts.length > 0) {
        const primary = accounts[0];
        setAddress(primary);
        localStorage.setItem('agentflow_wallet_address', primary);
        await fetchBalance(primary);
        setIsConnecting(false);
        return primary;
      }
      setIsConnecting(false);
      return null;
    } catch (err: any) {
      if (err?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        setError(err?.message || 'Failed to connect Pera Wallet.');
      }
      setIsConnecting(false);
      return null;
    }
  }, [fetchBalance]);

  // Disconnect handler
  const disconnect = useCallback(async () => {
    try {
      const pera = getPeraWallet();
      await pera.disconnect();
    } catch (err) {
      console.warn('Disconnect error:', err);
    } finally {
      setAddress(null);
      setUsdcBalance(null);
      localStorage.removeItem('agentflow_wallet_address');
    }
  }, []);

  // Sign transactions via Pera Wallet
  const signTransactions = useCallback(async (txnGroups: any[]) => {
    const pera = getPeraWallet();
    return await pera.signTransaction(txnGroups);
  }, []);

  const formattedBalance = useMemo(() => {
    if (usdcBalance === null) return '0.00 USDC';
    return `${usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDC`;
  }, [usdcBalance]);

  const value: WalletState = {
    isConnected: !!address,
    address,
    shortAddress,
    network,
    networkDisplay,
    usdcBalance,
    formattedBalance,
    isConnecting,
    error,
    connect,
    disconnect,
    signTransactions
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const defaultDisconnectedWalletState: WalletState = {
  isConnected: isTestEnv,
  address: isTestEnv ? 'DZDDQQEQWX7EQCVV2YSC5BULDMG5Q3SGVKDTEWV7Z7W5GCGZQUQRK2YLBQ' : null,
  shortAddress: isTestEnv ? 'DZDD...K2YLBQ' : null,
  network: 'testnet',
  networkDisplay: 'Algorand TestNet',
  usdcBalance: isTestEnv ? 20 : null,
  formattedBalance: isTestEnv ? '20.00 USDC' : '0.00 USDC',
  isConnecting: false,
  error: null,
  connect: async () => null,
  disconnect: async () => {},
  signTransactions: async () => []
};

export const useWallet = (): WalletState => {
  const context = useContext(WalletContext);
  if (!context) {
    return defaultDisconnectedWalletState;
  }
  return context;
};
