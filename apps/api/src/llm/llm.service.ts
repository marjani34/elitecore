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

    // Streaming keeps the connection busy while the model writes; long silent requests get dropped by some gateways.
    let res = await this.postWithRetry({ model: this.model, stream: true, response_format: { type: 'json_object' }, messages });
    // Some gateways/models reject JSON mode: retry once without it (the prompts already demand JSON).
    if (res.status === 400 || res.status === 422) {
      const text = await res.text();
      if (/response_format|json/i.test(text)) {
        this.logger.warn('JSON mode not supported by this model; retrying without response_format');
        res = await this.postWithRetry({ model: this.model, stream: true, messages });
      } else {
        return this.fail(res.status, text);
      }
    }
    if (!res.ok) return this.fail(res.status, await res.text());

    const content = await this.readContent(res);
    const parsed = extractJson(content);
    if (parsed === undefined) {
      this.logger.error(`AI returned non-JSON: ${content.slice(0, 300)}`);
      throw new BadGatewayException('پاسخ سرویس هوش مصنوعی قابل خواندن نبود.');
    }
    return parsed as T;
  }

  /** Reads either a streamed (text/event-stream) or a normal JSON completion. */
  private async readContent(res: Response): Promise<string> {
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('text/event-stream') || !res.body) {
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content ?? '';
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    const handle = (line: string) => {
      const l = line.trim();
      if (!l.startsWith('data:')) return;
      const data = l.slice(5).trim();
      if (!data || data === '[DONE]') return;
      try {
        const j = JSON.parse(data) as { choices?: { delta?: { content?: string }; message?: { content?: string } }[] };
        content += j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? '';
      } catch {
        // ignore keep-alive or malformed lines
      }
    };
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.forEach(handle);
      }
      buffer += decoder.decode();
      buffer.split('\n').forEach(handle);
    } catch (err) {
      const reason = netReason(err);
      this.logger.error(`AI stream from ${new URL(this.baseUrl).host} broke after ${content.length} chars: ${reason}`);
      throw new BadGatewayException(`ارتباط با سرویس هوش مصنوعی وسط پاسخ قطع شد: ${reason}`);
    }
    return content;
  }

  /** One retry when the connection itself fails (not for HTTP errors). */
  private async postWithRetry(body: Record<string, unknown>): Promise<Response> {
    try {
      return await this.post(body);
    } catch (err) {
      this.logger.warn('AI connection failed; retrying once');
      await new Promise((r) => setTimeout(r, 1500));
      return this.post(body).catch(() => {
        throw err;
      });
    }
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
      const reason = netReason(err);
      this.logger.error(`AI request to ${new URL(this.baseUrl).host} failed: ${reason}`);
      throw new BadGatewayException(`سرور به سرویس هوش مصنوعی (${new URL(this.baseUrl).host}) دسترسی ندارد: ${reason}`);
    }
  }

  /** Connectivity check for /api/health: can this server reach the AI provider at all? (no key, no cost) */
  async ping(): Promise<{ host: string; reachable: boolean; status?: number; ms: number; error?: string }> {
    const host = new URL(this.baseUrl).host;
    const started = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, { signal: AbortSignal.timeout(10_000) });
      return { host, reachable: true, status: res.status, ms: Date.now() - started };
    } catch (err) {
      return { host, reachable: false, ms: Date.now() - started, error: netReason(err) };
    }
  }

  private fail(status: number, text: string): never {
    this.logger.error(`AI ${status}: ${text.slice(0, 500)}`);
    if (status === 401 || status === 403) throw new BadGatewayException('کلید سرویس هوش مصنوعی نامعتبر است.');
    if (status === 402 || status === 429) throw new BadGatewayException('اعتبار یا سهمیه سرویس هوش مصنوعی تمام شده است.');
    throw new BadGatewayException(`سرویس هوش مصنوعی خطا داد (${status}).`);
  }
}

/** Turns Node's opaque "fetch failed" into the real network reason (DNS, refused, timeout, TLS…). */
function netReason(err: unknown): string {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'timeout';
  const code = e?.cause?.code;
  const msg = e?.cause?.message ?? e?.message ?? String(err);
  return code ? `${code} (${msg})` : msg;
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
