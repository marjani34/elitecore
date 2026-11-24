import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { LlmModule } from './llm/llm.module';
import { SourcesModule } from './sources/sources.module';
import { AgentsModule } from './agents/agents.module';
import { DbModule } from './db/db.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, LlmModule, SourcesModule, AgentsModule, DbModule, ProductsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
