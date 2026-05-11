import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { AgentActionsGuard } from './guards/agent-actions.guard';

@Module({
  controllers: [AgentsController],
  providers: [AgentsService, AgentActionsGuard],
})
export class AgentsModule {}
