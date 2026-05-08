import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SolanaPriceQueryDto } from './dto/solana-price-query.dto';
import { SolanaTokenQueryDto } from './dto/solana-token-query.dto';
import { SolanaTransferActionDto } from './dto/solana-transfer-action.dto';
import { AgentsService } from './agents.service';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get('solana')
  @ApiOperation({ summary: 'Describe el agente MVP de Solana' })
  getSolanaAgentProfile() {
    return this.agentsService.getSolanaAgentProfile();
  }

  @Get('solana/tokens')
  @ApiOperation({
    summary: 'Lista los tokens de Solana soportados por el agente',
  })
  getSupportedTokens() {
    return this.agentsService.getSupportedTokens();
  }

  @Get('solana/status')
  @ApiOperation({
    summary: 'Verifica que el agente este conectado al RPC de Solana',
  })
  getSolanaConnectionStatus() {
    return this.agentsService.getSolanaConnectionStatus();
  }

  @Get('solana/price')
  @ApiOperation({
    summary: 'Consulta el precio de un token soportado en Solana',
  })
  getTokenPrice(@Query() query: SolanaPriceQueryDto) {
    return this.agentsService.getTokenPrice(query.token, query.vsCurrency);
  }

  @Get('solana/onchain')
  @ApiOperation({
    summary: 'Consulta el estado on-chain de un token soportado en Solana',
  })
  getTokenOnChainSnapshot(@Query() query: SolanaTokenQueryDto) {
    return this.agentsService.getTokenOnChainSnapshot(query.token);
  }

  @Get('solana/mint')
  @ApiOperation({
    summary: 'Lee la metadata real del mint para un token soportado en Solana',
  })
  getTokenMintMetadata(@Query() query: SolanaTokenQueryDto) {
    return this.agentsService.getTokenMintMetadata(query.token);
  }

  @Get('solana/wallet')
  @ApiOperation({
    summary: 'Consulta el estado de la wallet del agente de Solana',
  })
  getAgentWalletStatus() {
    return this.agentsService.getAgentWalletStatus();
  }

  @Post('solana/actions/transfer/prepare')
  @ApiOperation({
    summary: 'Prepara una transferencia SOL usando la wallet del agente',
  })
  prepareSolTransfer(@Body() payload: SolanaTransferActionDto) {
    return this.agentsService.prepareSolTransfer(
      payload.recipient,
      payload.amountSol,
    );
  }

  @Post('solana/actions/transfer/sign')
  @ApiOperation({
    summary: 'Firma una transferencia SOL usando la wallet del agente',
  })
  signSolTransfer(@Body() payload: SolanaTransferActionDto) {
    return this.agentsService.signSolTransfer(
      payload.recipient,
      payload.amountSol,
    );
  }
}
