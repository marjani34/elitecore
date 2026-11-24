import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AgentsService } from './agents.service';

type Body = Record<string, unknown>;

@Controller('agents')
@UseGuards(AuthGuard)
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Post('features')
  @HttpCode(200)
  features(@Body() body: Body) {
    return this.agents.features(body ?? {});
  }

  @Post('journeys')
  @HttpCode(200)
  journeys(@Body() body: Body) {
    return this.agents.journeys(body ?? {});
  }

  @Post('criteria')
  @HttpCode(200)
  criteria(@Body() body: Body) {
    return this.agents.criteria(body ?? {});
  }

  @Post('review')
  @HttpCode(200)
  review(@Body() body: Body) {
    return this.agents.review(body ?? {});
  }

  @Post('report')
  @HttpCode(200)
  report(@Body() body: Body) {
    return this.agents.report(body ?? {});
  }
}
