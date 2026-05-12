import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
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
          database: {
            status: 'ok',
            details: {
              driver: 'postgres',
              host: 'localhost',
            },
          },
          solana: {
            status: 'ok',
            details: {
              cluster: 'devnet',
              rpcEndpoint: 'https://api.devnet.solana.com',
            },
          },
        },
      }),
      getDatabaseHealth: jest.fn().mockResolvedValue({
        status: 'ok',
        driver: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'beegent_solana',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({
        status: 'ok',
        services: {
          database: {
            status: 'ok',
            details: {
              driver: 'postgres',
              host: 'localhost',
            },
          },
          solana: {
            status: 'ok',
            details: {
              cluster: 'devnet',
              rpcEndpoint: 'https://api.devnet.solana.com',
            },
          },
        },
      });
  });

  it('/health/db (GET)', () => {
    return request(app.getHttpServer()).get('/health/db').expect(200).expect({
      status: 'ok',
      driver: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'beegent_solana',
    });
  });
});
