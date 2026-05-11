import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AgentActionsGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const configuredKey = this.configService
      .get<string>('AGENT_ACTIONS_KEY')
      ?.trim();

    if (!configuredKey) {
      throw new ServiceUnavailableException(
        'Las acciones que usan la wallet del agente estan deshabilitadas hasta configurar AGENT_ACTIONS_KEY.',
      );
    }

    const providedKey = this.getHeaderValue(request, 'x-agent-actions-key');

    if (!providedKey || providedKey !== configuredKey) {
      throw new UnauthorizedException(
        'x-agent-actions-key es obligatorio para preparar o firmar transferencias.',
      );
    }

    return true;
  }

  private getHeaderValue(request: Request, headerName: string) {
    const headerValue = request.headers[headerName];

    if (Array.isArray(headerValue)) {
      return headerValue[0]?.trim();
    }

    return typeof headerValue === 'string' ? headerValue.trim() : undefined;
  }
}
