import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getDatabaseHealth() {
    if (!this.dataSource) {
      throw new ServiceUnavailableException(
        'El DataSource de PostgreSQL no esta disponible en este contexto.',
      );
    }

    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException(
        'La conexion a PostgreSQL no esta inicializada.',
      );
    }

    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible consultar PostgreSQL en este momento.',
      );
    }

    const options = this.dataSource.options;
    const host =
      'host' in options && typeof options.host === 'string'
        ? options.host
        : null;
    const port =
      'port' in options && typeof options.port === 'number'
        ? options.port
        : null;
    const database =
      'database' in options && typeof options.database === 'string'
        ? options.database
        : null;

    return {
      status: 'ok',
      driver: options.type,
      host,
      port,
      database,
      checkedAt: new Date().toISOString(),
    };
  }
}
