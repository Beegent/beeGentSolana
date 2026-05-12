import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AgentsService } from './agents/agents.service';

type HealthDependencyStatus = {
  status: 'ok';
  details: unknown;
};

type UnhealthyDependencyStatus = {
  status: 'error';
  message: string;
};

@Injectable()
export class AppService {
  constructor(
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly agentsService?: AgentsService,
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

  async getSystemHealth() {
    const checkedAt = new Date().toISOString();
    const [databaseResult, solanaResult] = await Promise.allSettled([
      this.getDatabaseHealth(),
      this.getSolanaRpcHealth(),
    ]);

    const services = {
      database: this.mapHealthResult(databaseResult),
      solana: this.mapHealthResult(solanaResult),
    };

    if (
      services.database.status === 'error' ||
      services.solana.status === 'error'
    ) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        checkedAt,
        services,
      });
    }

    return {
      status: 'ok',
      checkedAt,
      services,
    };
  }

  private async getSolanaRpcHealth() {
    if (!this.agentsService) {
      throw new ServiceUnavailableException(
        'El servicio de Solana no esta disponible en este contexto.',
      );
    }

    const health = await this.agentsService.getSolanaConnectionStatus();

    return {
      status: health.health,
      network: health.network,
      cluster: health.cluster,
      rpcEndpoint: health.rpcEndpoint,
      latestBlockhash: health.latestBlockhash,
      lastValidBlockHeight: health.lastValidBlockHeight,
      slot: health.slot,
      source: health.source,
    };
  }

  private mapHealthResult<T>(
    result: PromiseSettledResult<T>,
  ): HealthDependencyStatus | UnhealthyDependencyStatus {
    if (result.status === 'fulfilled') {
      return {
        status: 'ok',
        details: result.value,
      };
    }

    return {
      status: 'error',
      message: this.getErrorMessage(result.reason),
    };
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'No fue posible obtener el estado de salud del servicio.';
  }
}
