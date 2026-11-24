import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { str } from '../common/clean';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 3_500_000;

interface Row {
  id: string;
  data: Record<string, unknown>;
  updated_at: Date;
}

function checkId(id: string) {
  if (!UUID.test(id)) throw new BadRequestException('شناسه محصول نامعتبر است.');
}

/** One row per product; the product's full state lives in `data` (jsonb). */
@Injectable()
export class ProductsService {
  constructor(private readonly db: DbService) {}

  /** Newest first. The large source-code context is left out of the list. */
  async list() {
    const rows = await this.db.query<Row>(
      `select id, data #- '{source,context}' as data, updated_at from products order by updated_at desc limit 200`,
    );
    return rows.map((r) => ({ ...r.data, id: r.id, updatedAt: r.updated_at }));
  }

  async get(id: string) {
    checkId(id);
    const [row] = await this.db.query<Row>(`select id, data, updated_at from products where id = $1`, [id]);
    if (!row) throw new NotFoundException('محصول پیدا نشد.');
    return { ...row.data, id: row.id, updatedAt: row.updated_at };
  }

  async save(id: string, data: unknown) {
    checkId(id);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('داده محصول نامعتبر است.');
    }
    const body: Record<string, unknown> = { ...(data as Record<string, unknown>), id };
    const json = JSON.stringify(body);
    if (json.length > MAX_BYTES) throw new BadRequestException('حجم داده محصول بیش از حد مجاز است.');
    const name = str(body.name, 200) || 'محصول';

    const [row] = await this.db.query<{ updated_at: Date }>(
      `insert into products (id, name, data) values ($1, $2, $3::jsonb)
       on conflict (id) do update set name = excluded.name, data = excluded.data, updated_at = now()
       returning updated_at`,
      [id, name, json],
    );
    return { id, updatedAt: row.updated_at };
  }

  async remove(id: string) {
    checkId(id);
    await this.db.query(`delete from products where id = $1`, [id]);
    return { id, deleted: true };
  }
}
