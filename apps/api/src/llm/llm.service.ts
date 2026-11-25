import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Client for any OpenAI-compatible Chat Completions API
 * (OpenAI itself, or gateways such as dargahee.ai, OpenRouter, etc.).
 *
 * Settings (first one found wins):
 *   key:   AI_API_KEY   | OPENAI_API_KEY  | DARGAHEE_API_KEY
 *   url:   AI_BASE_URL  | OPENAI_BASE_URL   (default https://api.openai.com/v1)
 *   model: AI_MODEL     | OPENAI_MODEL      (default gpt-4o-mini)
 *
 * With no key, isDemo is true and the agents use their scripted fallbacks.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  private first(...keys: string[]): string | undefined {
    for (const k of keys) {
      const v = this.config.get<string>(k)?.trim();
      if (v) return v;
    }
    return undefined;
  }

  private get apiKey() {
    return this.first('AI_API_KEY', 'OPENAI_API_KEY', 'DARGAHEE_API_KEY');
  }

  get model(): string {
    return this.first('AI_MODEL', 'OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  private get baseUrl(): string {
    return (this.first('AI_BASE_URL', 'OPENAI_BASE_URL') ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  get isDemo(): boolean {
    return !this.apiKey;
  }

  async json<T>(system: string, input: unknown): Promise<T> {
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) },
    ];

    let res = await this.post({ model: this.model, response_format: { type: 'json_object' }, messages });
    // Some gateways/models reject JSON mode: retry once without it (the prompts already demand JSON).
    if (res.status === 400 || res.status === 422) {
      const text = await res.text();
      if (/response_format|json/i.test(text)) {
        this.logger.warn('JSON mode not supported by this model; retrying without response_format');
        res = await this.post({ model: this.model, messages });
      } else {
        return this.fail(res.status, text);
      }
    }
    if (!res.ok) return this.fail(res.status, await res.text());

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(content);
    if (parsed === undefined) {
      this.logger.error(`AI returned non-JSON: ${content.slice(0, 300)}`);
      throw new BadGatewayException('پاسخ سرویس هوش مصنوعی قابل خواندن نبود.');
    }
    return parsed as T;
  }

  private async post(body: Record<string, unknown>): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      this.logger.error(`AI request failed: ${String(err)}`);
      throw new BadGatewayException('ارتباط با سرویس هوش مصنوعی برقرار نشد.');
    }
  }

  private fail(status: number, text: string): never {
    this.logger.error(`AI ${status}: ${text.slice(0, 500)}`);
    if (status === 401 || status === 403) throw new BadGatewayException('کلید سرویس هوش مصنوعی نامعتبر است.');
    if (status === 402 || status === 429) throw new BadGatewayException('اعتبار یا سهمیه سرویس هوش مصنوعی تمام شده است.');
    throw new BadGatewayException(`سرویس هوش مصنوعی خطا داد (${status}).`);
  }
}

/** Parses a JSON object even when the model wraps it in ```json fences or adds text around it. */
export function extractJson(content: string): unknown {
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return undefined;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
}
