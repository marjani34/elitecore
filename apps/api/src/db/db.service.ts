import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type QueryResultRow } from 'pg';

/**
 * Postgres (Supabase) connection.
 * DATABASE_URL should be Supabase's *transaction pooler* string (port 6543), which suits serverless.
 * The schema is created on first use, so no migration command is needed.
 */
const SCHEMA = `
create table if not exists products (
  id uuid primary key,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_updated_at_idx on products (updated_at desc);
-- Block Supabase's public Data API from reading this table; the API connects as the owner and is not affected.
alter table products enable row level security;
`;

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private pool?: Pool;
  private ready?: Promise<void>;

  constructor(private readonly config: ConfigService) {}

  private getPool(): Pool {
    if (this.pool) return this.pool;
    const url = this.config.get<string>('DATABASE_URL');
    if (!url) throw new ServiceUnavailableException('DATABASE_URL روی سرور تنظیم نشده است.');
    this.pool = new Pool({
      connectionString: url,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    this.pool.on('error', (err: Error) => this.logger.error(`Postgres pool error: ${err.message}`));
    return this.pool;
  }

  private ensureSchema(): Promise<void> {
    if (this.ready) return this.ready;
    const ready: Promise<void> = this.getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((err: Error) => {
        this.ready = undefined; // allow a retry on the next request
        this.logger.error(`Schema setup failed: ${err.message}`);
        throw new ServiceUnavailableException('اتصال به پایگاه داده برقرار نشد.');
      });
    this.ready = ready;
    return ready;
  }

  async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
    await this.ensureSchema();
    try {
      const res = await this.getPool().query<T>(text, params);
      return res.rows;
    } catch (err) {
      this.logger.error(`Query failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('خطا در پایگاه داده.');
    }
  }

  /** Connection check for /api/health. Error details only outside production. */
  async ping(): Promise<{ status: 'ok' | 'error' | 'not-configured'; latencyMs?: number; products?: number; error?: string }> {
    if (!this.config.get<string>('DATABASE_URL')) return { status: 'not-configured' };
    const started = Date.now();
    try {
      await this.ensureSchema();
      const res = await this.getPool().query<{ n: string }>('select count(*)::text as n from products');
      return { status: 'ok', latencyMs: Date.now() - started, products: Number(res.rows[0]?.n ?? 0) };
    } catch (err) {
      const detail = await this.getPool()
        .query('select 1')
        .then(() => (err as Error).message)
        .catch((e: Error) => e.message);
      return { status: 'error', ...(process.env.NODE_ENV === 'production' ? {} : { error: detail }) };
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
