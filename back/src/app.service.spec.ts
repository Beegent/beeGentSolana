import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

describe('AppService', () => {
  it('reporta la base de datos operativa cuando el DataSource responde', async () => {
    const query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const service = new AppService({
      isInitialized: true,
      query,
      options: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'beegent_solana',
      },
    } as unknown as DataSource);

    await expect(service.getDatabaseHealth()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        driver: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'beegent_solana',
      }),
    );
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('falla si el DataSource no esta disponible', async () => {
    const service = new AppService();

    await expect(service.getDatabaseHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('falla si PostgreSQL no responde', async () => {
    const service = new AppService({
      isInitialized: true,
      query: jest.fn().mockRejectedValue(new Error('db down')),
      options: {
        type: 'postgres',
      },
    } as unknown as DataSource);

    await expect(service.getDatabaseHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('reporta el health global cuando PostgreSQL y Solana estan operativos', async () => {
    const service = new AppService(
      {
        isInitialized: true,
        query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        options: {
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          database: 'beegent_solana',
        },
      } as unknown as DataSource,
      {
        getSolanaConnectionStatus: jest.fn().mockResolvedValue({
          health: 'ok',
          network: 'solana',
          cluster: 'devnet',
          rpcEndpoint: 'https://api.devnet.solana.com',
          latestBlockhash: '9xQeWvG816bUx9EPjHmaT23yvVMXQLYJbP9P7p9B5M5S',
          lastValidBlockHeight: 278000123,
          slot: 311000001,
          source: 'solana-rpc',
        }),
      } as never,
    );

    await expect(service.getSystemHealth()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        services: expect.objectContaining({
          database: expect.objectContaining({ status: 'ok' }),
          solana: expect.objectContaining({ status: 'ok' }),
        }),
      }),
    );
  });

  it('degrada el health global cuando Solana RPC no responde', async () => {
    const service = new AppService(
      {
        isInitialized: true,
        query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        options: {
          type: 'postgres',
        },
      } as unknown as DataSource,
      {
        getSolanaConnectionStatus: jest
          .fn()
          .mockRejectedValue(new Error('rpc unavailable')),
      } as never,
    );

    await expect(service.getSystemHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
