import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: {
    getHello: jest.Mock;
    getSystemHealth: jest.Mock;
    getDatabaseHealth: jest.Mock;
  };

  beforeEach(async () => {
    appService = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
      getSystemHealth: jest.fn().mockResolvedValue({
        status: 'ok',
        services: {
          database: { status: 'ok', details: { driver: 'postgres' } },
          solana: { status: 'ok', details: { cluster: 'devnet' } },
        },
      }),
      getDatabaseHealth: jest.fn().mockResolvedValue({
        status: 'ok',
        driver: 'postgres',
      }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('expone el health global del backend', async () => {
      await expect(appController.getSystemHealth()).resolves.toEqual(
        expect.objectContaining({
          status: 'ok',
          services: expect.objectContaining({
            database: expect.objectContaining({ status: 'ok' }),
            solana: expect.objectContaining({ status: 'ok' }),
          }),
        }),
      );
      expect(appService.getSystemHealth).toHaveBeenCalledTimes(1);
    });

    it('expone el health de la base de datos', async () => {
      await expect(appController.getDatabaseHealth()).resolves.toEqual(
        expect.objectContaining({
          status: 'ok',
          driver: 'postgres',
        }),
      );
      expect(appService.getDatabaseHealth).toHaveBeenCalledTimes(1);
    });
  });
});
