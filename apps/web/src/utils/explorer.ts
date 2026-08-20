/**
 * Utility for generating Algorand block explorer URLs.
 */

const BASE_URL = 'https://testnet.explorer.perawallet.app';

export function getExplorerTxUrl(transactionId?: string): string | null {
  if (!transactionId) {
    return null;
  }
  return `${BASE_URL}/tx/${transactionId}`;
}
