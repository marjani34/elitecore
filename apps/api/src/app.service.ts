import { Injectable } from '@nestjs/common';
import { LlmService } from './llm/llm.service';
import { DbService } from './db/db.service';

@Injectable()
export class AppService {
  constructor(
    private readonly llm: LlmService,
    private readonly db: DbService,
  ) {}

  async health() {
    return {
      status: 'ok',
      aiMode: this.llm.isDemo ? 'demo' : 'live',
      database: await this.db.ping(),
    };
  }
}
