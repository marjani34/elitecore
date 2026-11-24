import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Source code context and markdown files can be large.
  app.useBodyParser('json', { limit: '4mb' });

  // WEB_ORIGIN: comma-separated list of allowed frontend URLs (e.g. your Vercel web URL).
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, allowedHeaders: ['Content-Type', 'Authorization'] });

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
