export type SolanaTokenDefinition = {
  symbol: string;
  name: string;
  address: string;
  coingeckoId: string;
  isNative?: boolean;
};

export type SolanaCluster = 'devnet' | 'testnet' | 'mainnet-beta';

export const SOLANA_AGENT_ID = 'solana-price-agent';

export const SOLANA_RPC_ENDPOINTS: Record<SolanaCluster, string> = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

export const SOLANA_TOKENS: SolanaTokenDefinition[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112',
    coingeckoId: 'solana',
    isNative: true,
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    coingeckoId: 'jupiter-exchange-solana',
  },
  {
    symbol: 'PYTH',
    name: 'Pyth Network',
    address: 'HZ1JovNiVvGrGNiiYvZ8xa8Wj7xnyXobA7T9JwNw1x4',
    coingeckoId: 'pyth-network',
  },
  {
    symbol: 'RAY',
    name: 'Raydium',
    address: '4k3Dyjzvzp8eMZWUXbY8s8T1M7A7gP4iR2uN7sLxS7m',
    coingeckoId: 'raydium',
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6YaB1pPB263f2sN1',
    coingeckoId: 'bonk',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    coingeckoId: 'usd-coin',
  },
];
