import { Keypair, PublicKey } from '@solana/web3.js';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AgentsService } from './agents.service';

describe('AgentsService', () => {
  let service: AgentsService;

  beforeEach(() => {
    service = new AgentsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('expone el perfil del agente de Solana', () => {
    expect(service.getSolanaAgentProfile()).toEqual(
      expect.objectContaining({
        id: 'solana-price-agent',
        network: 'solana',
        cluster: 'devnet',
        sources: expect.arrayContaining(['coingecko', 'solana-rpc']),
      }),
    );
  });

  it('lista tokens soportados', () => {
    const response = service.getSupportedTokens();

    expect(response.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'SOL' }),
        expect.objectContaining({ symbol: 'BONK' }),
      ]),
    );
  });

  it('verifica la conexion RPC con Solana', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: 'ok',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: {
            context: { slot: 311000001 },
            value: {
              blockhash: '9xQeWvG816bUx9EPjHmaT23yvVMXQLYJbP9P7p9B5M5S',
              lastValidBlockHeight: 278000123,
            },
          },
        }),
      } as Response);

    const response = await service.getSolanaConnectionStatus();

    expect(response).toEqual(
      expect.objectContaining({
        cluster: 'devnet',
        health: 'ok',
        source: 'solana-rpc',
        latestBlockhash: '9xQeWvG816bUx9EPjHmaT23yvVMXQLYJbP9P7p9B5M5S',
      }),
    );
  });

  it('consulta el precio de un token soportado', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        solana: {
          usd: 173.52,
          usd_24h_change: 4.3456,
          last_updated_at: 1715179200,
        },
      }),
    } as Response);

    const response = await service.getTokenPrice('SOL');

    expect(response).toEqual(
      expect.objectContaining({
        agentId: 'solana-price-agent',
        token: expect.objectContaining({ symbol: 'SOL' }),
        market: expect.objectContaining({
          currency: 'usd',
          price: 173.52,
          change24h: 4.35,
        }),
      }),
    );
  });

  it('consulta datos on-chain de un token SPL soportado', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          context: { slot: 311123456 },
          value: {
            amount: '999999999000000',
            decimals: 6,
            uiAmount: 999999999,
            uiAmountString: '999999999',
          },
        },
      }),
    } as Response);

    const response = await service.getTokenOnChainSnapshot('USDC');

    expect(response).toEqual(
      expect.objectContaining({
        source: 'solana-rpc',
        token: expect.objectContaining({ symbol: 'USDC', isNative: false }),
        onChain: expect.objectContaining({
          decimals: 6,
          rawAmount: '999999999000000',
          uiAmountString: '999999999',
        }),
      }),
    );
  });

  it('consulta datos on-chain del activo nativo SOL', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          context: { slot: 311999999 },
          value: {
            total: '600000000000000000',
            circulating: '520000000000000000',
            nonCirculating: '80000000000000000',
            nonCirculatingAccounts: ['account-1', 'account-2'],
          },
        },
      }),
    } as Response);

    const response = await service.getTokenOnChainSnapshot('SOL');

    expect(response).toEqual(
      expect.objectContaining({
        source: 'solana-rpc',
        token: expect.objectContaining({ symbol: 'SOL', isNative: true }),
        onChain: expect.objectContaining({
          totalLamports: '600000000000000000',
          circulatingLamports: '520000000000000000',
          nonCirculatingAccounts: 2,
        }),
      }),
    );
  });

  it('lee metadata real del mint para un token SPL soportado', async () => {
    jest.spyOn(service as never, 'getConnection' as never).mockReturnValue({
      getParsedAccountInfo: jest.fn().mockResolvedValue({
        value: {
          owner: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          lamports: 1461600,
          data: {
            program: 'spl-token',
            parsed: {
              type: 'mint',
              info: {
                decimals: 6,
                freezeAuthority: null,
                isInitialized: true,
                mintAuthority: '3o1CUzKqr3y6xtUh5neG9W7mJQKtmA7thQ3r8qkXwX6N',
                supply: '999999999000000',
              },
            },
            space: 82,
          },
        },
      }),
    } as never);

    const response = await service.getTokenMintMetadata('USDC');

    expect(response).toEqual(
      expect.objectContaining({
        source: 'solana-rpc',
        token: expect.objectContaining({ symbol: 'USDC', isNative: false }),
        mint: expect.objectContaining({
          decimals: 6,
          supply: '999999999000000',
          isInitialized: true,
        }),
      }),
    );
  });

  it('devuelve estado no configurado si la wallet del agente no existe', async () => {
    const response = await service.getAgentWalletStatus();

    expect(response).toEqual(
      expect.objectContaining({
        wallet: expect.objectContaining({
          configured: false,
          canSign: false,
        }),
      }),
    );
  });

  it('expone el estado de la wallet del agente cuando existe configuracion', async () => {
    const wallet = Keypair.generate();

    jest
      .spyOn(service as never, 'getAgentWalletOrNull' as never)
      .mockReturnValue(wallet as never);
    jest.spyOn(service as never, 'getConnection' as never).mockReturnValue({
      getBalance: jest.fn().mockResolvedValue(2500000000),
    } as never);

    const response = await service.getAgentWalletStatus();

    expect(response).toEqual(
      expect.objectContaining({
        wallet: expect.objectContaining({
          configured: true,
          canSign: true,
          publicKey: wallet.publicKey.toBase58(),
          balanceLamports: 2500000000,
          balanceSol: 2.5,
        }),
      }),
    );
  });

  it('prepara una transferencia SOL con la wallet del agente', async () => {
    const wallet = Keypair.generate();
    const recipient = Keypair.generate().publicKey.toBase58();

    jest
      .spyOn(service as never, 'getAgentWalletOrNull' as never)
      .mockReturnValue(wallet as never);
    jest.spyOn(service as never, 'getConnection' as never).mockReturnValue({
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: '9xQeWvG816bUx9EPjHmaT23yvVMXQLYJbP9P7p9B5M5S',
        lastValidBlockHeight: 278000123,
      }),
    } as never);

    const response = await service.prepareSolTransfer(recipient, '0.25');

    expect(response).toEqual(
      expect.objectContaining({
        action: 'prepare-sol-transfer',
        wallet: wallet.publicKey.toBase58(),
        recipient,
        amountSol: '0.25',
        lamports: 250000000,
      }),
    );
    expect(response.unsignedMessageBase64).toEqual(expect.any(String));
  });

  it('firma una transferencia SOL con la wallet del agente', async () => {
    const wallet = Keypair.generate();
    const recipient = Keypair.generate().publicKey.toBase58();

    jest
      .spyOn(service as never, 'getAgentWalletOrNull' as never)
      .mockReturnValue(wallet as never);
    jest.spyOn(service as never, 'getConnection' as never).mockReturnValue({
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: '9xQeWvG816bUx9EPjHmaT23yvVMXQLYJbP9P7p9B5M5S',
        lastValidBlockHeight: 278000123,
      }),
    } as never);

    const response = await service.signSolTransfer(recipient, '0.1');

    expect(response).toEqual(
      expect.objectContaining({
        action: 'sign-sol-transfer',
        wallet: wallet.publicKey.toBase58(),
        recipient,
        amountSol: '0.1',
        lamports: 100000000,
      }),
    );
    expect(response.signatureBase64).toEqual(expect.any(String));
    expect(response.signedTransactionBase64).toEqual(expect.any(String));
  });

  it('falla al preparar acciones si la wallet no esta configurada', async () => {
    await expect(
      service.prepareSolTransfer(
        Keypair.generate().publicKey.toBase58(),
        '0.1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rechaza tokens no soportados', async () => {
    await expect(service.getTokenPrice('UNKNOWN')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
