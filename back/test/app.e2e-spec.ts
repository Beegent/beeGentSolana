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
    getDatabaseHealth: jest.Mock;
  };

  beforeEach(async () => {
    appService = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
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
