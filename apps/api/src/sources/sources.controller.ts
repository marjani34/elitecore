import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SourcesService, type AnalyzeBody } from './sources.service';

/**
 * Step 1 – Kaveh. The client calls prepare → summarize (once per part, in parallel) → finalize,
 * so each request stays short on serverless. analyze does everything in one request.
 */
@Controller('sources')
@UseGuards(AuthGuard)
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Post('prepare')
  @HttpCode(200)
  prepare(@Body() body: AnalyzeBody) {
    return this.sources.prepare(body);
  }

  @Post('summarize')
  @HttpCode(200)
  summarize(@Body() body: { chunk?: unknown }) {
    return this.sources.summarize(body);
  }

  @Post('finalize')
  @HttpCode(200)
  finalize(@Body() body: Parameters<SourcesService['finalize']>[0]) {
    return this.sources.finalize(body);
  }

  @Post('analyze')
  @HttpCode(200)
  analyze(@Body() body: AnalyzeBody) {
    return this.sources.analyze(body);
  }
}
