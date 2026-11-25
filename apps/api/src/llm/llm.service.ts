import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin wrapper around the OpenAI Chat Completions API (JSON mode).
 * When OPENAI_API_KEY is missing, isDemo is true and callers use their scripted fallbacks.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  get isDemo(): boolean {
    return !this.config.get<string>('OPENAI_API_KEY');
  }

  async json<T>(system: string, input: unknown): Promise<T> {
    const key = this.config.get<string>('OPENAI_API_KEY');
    const model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    const base = (this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');

    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) },
          ],
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (err) {
      this.logger.error(`AI request failed: ${String(err)}`);
      throw new BadGatewayException('ارتباط با سرویس هوش مصنوعی برقرار نشد.');
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`AI ${res.status}: ${text.slice(0, 500)}`);
      throw new BadGatewayException(`سرویس هوش مصنوعی خطا داد (${res.status}).`);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '{}';
    try {
      return JSON.parse(content) as T;
    } catch {
      this.logger.error(`AI returned non-JSON: ${content.slice(0, 300)}`);
      throw new BadGatewayException('پاسخ سرویس هوش مصنوعی قابل خواندن نبود.');
    }
  }
}
