export function formatBaseUnits(baseUnits: number, _asset?: string | number): string {
  // Hardcoded mapping for Phase 6/7 assumptions:
  // Asset '10458941' (TestNet USDC) has 6 decimals
  // 1,000,000 base units = 1 USDC
  
  const decimals = 6;
  const value = baseUnits / Math.pow(10, decimals);
  
  // Format to standard USD/USDC display
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });

  return `${formatter.format(value)} USDC`;
}
