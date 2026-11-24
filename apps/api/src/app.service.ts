import { Injectable } from '@nestjs/common';
import { LlmService } from './llm/llm.service';

@Injectable()
export class AppService {
  constructor(private readonly llm: LlmService) {}

  health() {
    return { status: 'ok', aiMode: this.llm.isDemo ? 'demo' : 'live' };
  }
}
