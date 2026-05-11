import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { join } from 'node:path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenvConfig({ path: '.env.development' });

function parseNumber(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

const isProduction = process.env.NODE_ENV === 'production';

const dataSourceConfig: DataSourceOptions = {
  type: 'postgres',
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  entities: [
    join(__dirname, '..', '**', '*.entity{.ts,.js}'),
    join(__dirname, '..', '**', '*.entities{.ts,.js}'),
  ],
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  logging: parseBoolean(process.env.DB_LOGGING, !isProduction),
  synchronize: parseBoolean(process.env.DB_SYNCHRONIZE, !isProduction),
  dropSchema: parseBoolean(process.env.DB_DROP_SCHEMA, false),
};

const config: TypeOrmModuleOptions = {
  ...dataSourceConfig,
  autoLoadEntities: true,
};

export default registerAs('typeorm', () => config);
export const connectionSource = new DataSource(dataSourceConfig);
