import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentActionsGuard } from './agent-actions.guard';

function createExecutionContext(headers: Record<string, string> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
      }),
    }),
  } as ExecutionContext;
}

describe('AgentActionsGuard', () => {
  it('falla si AGENT_ACTIONS_KEY no esta configurada', () => {
    const guard = new AgentActionsGuard({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      ServiceUnavailableException,
    );
  });

  it('falla si la cabecera no coincide con la clave configurada', () => {
    const guard = new AgentActionsGuard({
      get: jest.fn().mockReturnValue('clave-segura'),
    } as unknown as ConfigService);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          'x-agent-actions-key': 'otra-clave',
        }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('permite continuar cuando la cabecera coincide', () => {
    const guard = new AgentActionsGuard({
      get: jest.fn().mockReturnValue('clave-segura'),
    } as unknown as ConfigService);

    expect(
      guard.canActivate(
        createExecutionContext({
          'x-agent-actions-key': 'clave-segura',
        }),
      ),
    ).toBe(true);
  });
});
