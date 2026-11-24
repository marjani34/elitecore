import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GithubService } from './github.service';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';

@Module({
  imports: [AuthModule],
  controllers: [SourcesController],
  providers: [SourcesService, GithubService],
})
export class SourcesModule {}
