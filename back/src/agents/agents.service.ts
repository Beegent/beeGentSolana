import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type ParsedAccountData,
} from '@solana/web3.js';
import {
  SOLANA_AGENT_ID,
  SOLANA_RPC_ENDPOINTS,
  SOLANA_TOKENS,
  type SolanaCluster,
  type SolanaTokenDefinition,
} from './agents.catalog';

type CoinGeckoMarketData = Record<string, number | undefined>;
type CoinGeckoPriceResponse = Record<string, CoinGeckoMarketData | undefined>;
type SolanaRpcResponse<T> =
  | {
      jsonrpc: '2.0';
      id: number;
      result: T;
    }
  | {
      jsonrpc: '2.0';
      id: number;
      error: {
        code: number;
        message: string;
      };
    };
type SolanaHealthResult = 'ok';
type SolanaBlockhashResult = {
  context: {
    slot: number;
  };
  value: {
    blockhash: string;
    lastValidBlockHeight: number;
  };
};
type SolanaTokenSupplyResult = {
  context: {
    slot: number;
  };
  value: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
  };
};
type SolanaSupplyResult = {
  context: {
    slot: number;
  };
  value: {
    total: string;
    circulating: string;
    nonCirculating: string;
    nonCirculatingAccounts: string[];
  };
};

@Injectable()
export class AgentsService {
  getSolanaAgentProfile() {
    return {
      id: SOLANA_AGENT_ID,
      name: 'Solana Market Agent',
      network: 'solana',
      cluster: this.getCluster(),
      capabilities: [
        'token-discovery',
        'price-lookups',
        'rpc-status',
        'onchain-token-data',
      ],
      sources: ['coingecko', 'solana-rpc'],
      rpcEndpoint: this.getRpcEndpoint(),
      walletConfigured: this.hasAgentWallet(),
      trackedTokens: SOLANA_TOKENS.length,
    };
  }

  getSupportedTokens() {
    return {
      agentId: SOLANA_AGENT_ID,
      network: 'solana',
      cluster: this.getCluster(),
      tokens: SOLANA_TOKENS.map(({ coingeckoId, ...token }) => token),
    };
  }

  async getSolanaConnectionStatus() {
    const [health, latestBlockhash] = await Promise.all([
      this.callSolanaRpc<SolanaHealthResult>('getHealth'),
      this.callSolanaRpc<SolanaBlockhashResult>('getLatestBlockhash', [
        {
          commitment: 'confirmed',
        },
      ]),
    ]);

    return {
      agentId: SOLANA_AGENT_ID,
      network: 'solana',
      cluster: this.getCluster(),
      rpcEndpoint: this.getRpcEndpoint(),
      health,
      latestBlockhash: latestBlockhash.value.blockhash,
      lastValidBlockHeight: latestBlockhash.value.lastValidBlockHeight,
      slot: latestBlockhash.context.slot,
      source: 'solana-rpc',
    };
  }

  async getTokenPrice(tokenQuery: string, vsCurrency = 'usd') {
    const token = this.findToken(tokenQuery);
    const normalizedCurrency = vsCurrency.toLowerCase();
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(token.coingeckoId)}&vs_currencies=${encodeURIComponent(normalizedCurrency)}&include_24hr_change=true&include_last_updated_at=true`,
      {
        headers: {
          accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new BadGatewayException(
        'No fue posible consultar el precio del token en este momento.',
      );
    }

    const payload = (await response.json()) as CoinGeckoPriceResponse;
    const marketData = payload[token.coingeckoId];
    const price = marketData?.[normalizedCurrency];
    const change24h = marketData?.[`${normalizedCurrency}_24h_change`];
    const lastUpdatedAt = marketData?.last_updated_at;

    if (typeof price !== 'number') {
      throw new BadGatewayException(
        'La respuesta del proveedor de precios no incluyo el valor esperado.',
      );
    }

    return {
      agentId: SOLANA_AGENT_ID,
      token: {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
      },
      market: {
        currency: normalizedCurrency,
        price,
        change24h:
          typeof change24h === 'number' ? Number(change24h.toFixed(2)) : null,
        lastUpdatedAt:
          typeof lastUpdatedAt === 'number'
            ? new Date(lastUpdatedAt * 1000).toISOString()
            : null,
      },
      source: 'coingecko',
    };
  }

  async getTokenOnChainSnapshot(tokenQuery: string) {
    const token = this.findToken(tokenQuery);

    if (token.isNative) {
      const supply = await this.callSolanaRpc<SolanaSupplyResult>('getSupply', [
        {
          commitment: 'confirmed',
        },
      ]);

      return {
        agentId: SOLANA_AGENT_ID,
        network: 'solana',
        cluster: this.getCluster(),
        token: {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          isNative: true,
        },
        onChain: {
          slot: supply.context.slot,
          totalLamports: supply.value.total,
          circulatingLamports: supply.value.circulating,
          nonCirculatingLamports: supply.value.nonCirculating,
          nonCirculatingAccounts: supply.value.nonCirculatingAccounts.length,
        },
        source: 'solana-rpc',
      };
    }

    const supply = await this.callSolanaRpc<SolanaTokenSupplyResult>(
      'getTokenSupply',
      [token.address, { commitment: 'confirmed' }],
    );

    return {
      agentId: SOLANA_AGENT_ID,
      network: 'solana',
      cluster: this.getCluster(),
      token: {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        isNative: false,
      },
      onChain: {
        slot: supply.context.slot,
        decimals: supply.value.decimals,
        rawAmount: supply.value.amount,
        uiAmount: supply.value.uiAmount,
        uiAmountString: supply.value.uiAmountString,
      },
      source: 'solana-rpc',
    };
  }

  async getTokenMintMetadata(tokenQuery: string) {
    const token = this.findToken(tokenQuery);

    if (token.isNative) {
      return {
        agentId: SOLANA_AGENT_ID,
        network: 'solana',
        cluster: this.getCluster(),
        token: {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          isNative: true,
        },
        mint: null,
        nativeAsset: {
          decimals: 9,
          lamportsPerSol: LAMPORTS_PER_SOL,
        },
        source: 'solana-native',
      };
    }

    const mintPublicKey = new PublicKey(token.address);
    const connection = this.getConnection();
    const accountInfo = await connection.getParsedAccountInfo(
      mintPublicKey,
      'confirmed',
    );

    if (
      !accountInfo.value ||
      !this.isParsedAccountData(accountInfo.value.data)
    ) {
      throw new BadGatewayException(
        `No fue posible leer la metadata del mint para ${token.symbol}.`,
      );
    }

    if (accountInfo.value.data.parsed.type !== 'mint') {
      throw new BadGatewayException(
        `La cuenta ${token.address} no devolvio una estructura mint valida.`,
      );
    }

    const mintInfo = accountInfo.value.data.parsed.info as {
      decimals: number;
      freezeAuthority: string | null;
      isInitialized: boolean;
      mintAuthority: string | null;
      supply: string;
    };

    return {
      agentId: SOLANA_AGENT_ID,
      network: 'solana',
      cluster: this.getCluster(),
      token: {
        symbol: token.symbol,
        name: token.name,
        address: token.address,
        isNative: false,
      },
      mint: {
        address: mintPublicKey.toBase58(),
        ownerProgram: accountInfo.value.owner.toBase58(),
        lamports: accountInfo.value.lamports,
        decimals: mintInfo.decimals,
        supply: mintInfo.supply,
        isInitialized: mintInfo.isInitialized,
        mintAuthority: mintInfo.mintAuthority,
        freezeAuthority: mintInfo.freezeAuthority,
      },
      source: 'solana-rpc',
    };
  }

  async getAgentWalletStatus() {
    const wallet = this.getAgentWalletOrNull();

    if (!wallet) {
      return {
        agentId: SOLANA_AGENT_ID,
        network: 'solana',
        cluster: this.getCluster(),
        rpcEndpoint: this.getRpcEndpoint(),
        wallet: {
          configured: false,
          canSign: false,
          requiredEnv: ['SOLANA_WALLET_SECRET_KEY'],
        },
      };
    }

    const connection = this.getConnection();
    const balanceLamports = await connection.getBalance(
      wallet.publicKey,
      'confirmed',
    );

    return {
      agentId: SOLANA_AGENT_ID,
      network: 'solana',
      cluster: this.getCluster(),
      rpcEndpoint: this.getRpcEndpoint(),
      wallet: {
        configured: true,
        canSign: true,
        publicKey: wallet.publicKey.toBase58(),
        balanceLamports,
        balanceSol: balanceLamports / LAMPORTS_PER_SOL,
      },
      source: 'solana-wallet',
    };
  }

  async prepareSolTransfer(recipientAddress: string, amountSol: string) {
    const { recipient, lamports, transaction, latestBlockhash, wallet } =
      await this.buildSolTransferTransaction(recipientAddress, amountSol);

    return {
      agentId: SOLANA_AGENT_ID,
      action: 'prepare-sol-transfer',
      network: 'solana',
      cluster: this.getCluster(),
      wallet: wallet.publicKey.toBase58(),
      recipient: recipient.toBase58(),
      amountSol,
      lamports,
      recentBlockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      unsignedMessageBase64: Buffer.from(
        transaction.serializeMessage(),
      ).toString('base64'),
      source: 'solana-wallet',
    };
  }

  async signSolTransfer(recipientAddress: string, amountSol: string) {
    const { recipient, lamports, transaction, latestBlockhash, wallet } =
      await this.buildSolTransferTransaction(recipientAddress, amountSol);

    transaction.sign(wallet);

    return {
      agentId: SOLANA_AGENT_ID,
      action: 'sign-sol-transfer',
      network: 'solana',
      cluster: this.getCluster(),
      wallet: wallet.publicKey.toBase58(),
      recipient: recipient.toBase58(),
      amountSol,
      lamports,
      recentBlockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signatureBase64: transaction.signature
        ? Buffer.from(transaction.signature).toString('base64')
        : null,
      signedTransactionBase64: transaction
        .serialize({ verifySignatures: true, requireAllSignatures: true })
        .toString('base64'),
      source: 'solana-wallet',
    };
  }

  private findToken(tokenQuery: string): SolanaTokenDefinition {
    const normalizedToken = tokenQuery.trim().toUpperCase();
    const token = SOLANA_TOKENS.find(
      (currentToken) =>
        currentToken.symbol === normalizedToken ||
        currentToken.address === tokenQuery.trim(),
    );

    if (!token) {
      throw new NotFoundException(
        `El token ${tokenQuery} no esta soportado por este agente de Solana.`,
      );
    }

    return token;
  }

  private hasAgentWallet() {
    return Boolean(process.env.SOLANA_WALLET_SECRET_KEY?.trim());
  }

  private getAgentWalletOrNull() {
    const secretKey = process.env.SOLANA_WALLET_SECRET_KEY?.trim();

    if (!secretKey) {
      return null;
    }

    return Keypair.fromSecretKey(this.parseWalletSecretKey(secretKey));
  }

  private requireAgentWallet() {
    const wallet = this.getAgentWalletOrNull();

    if (!wallet) {
      throw new ServiceUnavailableException(
        'El agente no tiene una wallet configurada. Define SOLANA_WALLET_SECRET_KEY para preparar o firmar acciones.',
      );
    }

    return wallet;
  }

  private getCluster(): SolanaCluster {
    const cluster = process.env.SOLANA_CLUSTER?.toLowerCase();

    if (
      cluster === 'devnet' ||
      cluster === 'testnet' ||
      cluster === 'mainnet-beta'
    ) {
      return cluster;
    }

    return 'devnet';
  }

  private getRpcEndpoint(): string {
    return (
      process.env.SOLANA_RPC_URL || SOLANA_RPC_ENDPOINTS[this.getCluster()]
    );
  }

  private getConnection() {
    return new Connection(this.getRpcEndpoint(), 'confirmed');
  }

  private isParsedAccountData(
    data: Buffer | ParsedAccountData,
  ): data is ParsedAccountData {
    return typeof data === 'object' && 'parsed' in data;
  }

  private parseWalletSecretKey(secretKey: string) {
    try {
      if (secretKey.startsWith('[')) {
        const parsed = JSON.parse(secretKey) as number[];
        return Uint8Array.from(parsed);
      }

      if (secretKey.includes(',')) {
        const parsed = secretKey
          .split(',')
          .map((value) => Number(value.trim()));
        return Uint8Array.from(parsed);
      }
    } catch {
      throw new ServiceUnavailableException(
        'SOLANA_WALLET_SECRET_KEY no tiene un formato valido.',
      );
    }

    throw new ServiceUnavailableException(
      'SOLANA_WALLET_SECRET_KEY debe estar en formato JSON array o lista separada por comas.',
    );
  }

  private parseAmountSolToLamports(amountSol: string) {
    const [wholePart, decimalPart = ''] = amountSol.split('.');
    const normalizedDecimals = `${decimalPart}000000000`.slice(0, 9);
    const lamports =
      BigInt(wholePart) * BigInt(LAMPORTS_PER_SOL) + BigInt(normalizedDecimals);

    if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new BadGatewayException(
        'La cantidad solicitada excede el maximo soportado por este agente.',
      );
    }

    return Number(lamports);
  }

  private async buildSolTransferTransaction(
    recipientAddress: string,
    amountSol: string,
  ) {
    const connection = this.getConnection();
    const wallet = this.requireAgentWallet();
    const recipient = new PublicKey(recipientAddress);
    const lamports = this.parseAmountSolToLamports(amountSol);
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction();

    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipient,
        lamports,
      }),
    );

    return {
      connection,
      wallet,
      recipient,
      lamports,
      latestBlockhash,
      transaction,
    };
  }

  private async callSolanaRpc<T>(method: string, params: unknown[] = []) {
    const response = await fetch(this.getRpcEndpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException(
        'No fue posible conectar con el nodo RPC de Solana.',
      );
    }

    const payload = (await response.json()) as SolanaRpcResponse<T>;

    if ('error' in payload) {
      throw new BadGatewayException(
        `Solana RPC devolvio un error para ${method}: ${payload.error.message}`,
      );
    }

    return payload.result;
  }
}
