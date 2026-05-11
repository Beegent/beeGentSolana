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
});
