import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: {
    getHello: jest.Mock;
    getDatabaseHealth: jest.Mock;
  };

  beforeEach(async () => {
    appService = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
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
