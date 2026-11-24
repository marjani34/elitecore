import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SourcesService, type AnalyzeBody } from './sources.service';

@Controller('sources')
@UseGuards(AuthGuard)
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  /** Step 1 – Kaveh reads the git repository and/or markdown file and analyses the product. */
  @Post('analyze')
  @HttpCode(200)
  analyze(@Body() body: AnalyzeBody) {
    return this.sources.analyze(body);
  }
}
