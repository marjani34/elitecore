import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PROMPTS } from '../agents/agents.prompts';
import { mockAnalysis } from '../agents/agents.mock';
import { clip, list, str, strList } from '../common/clean';
import { GithubService, type RepoInfo } from './github.service';
import {
  chunkModules,
  COMPACTION_NOTE,
  mapLimit,
  splitModules,
  stripAgentBoilerplate,
  structuralDigest,
} from './markdown-digest';

export interface AnalyzeBody {
  gitUrl?: string;
  markdown?: string;
  markdownName?: string;
}

/** What the later agents read (features, review). */
const MAX_CONTEXT = 90_000;
/** Accepted markdown size (the request body limit is 4 MB on Vercel). */
const MAX_MARKDOWN = 3_000_000;
/** Below this, the cleaned markdown is passed to the agents as is. */
const SMALL_MARKDOWN = 50_000;
/** Size of each part Kaveh summarises separately. */
const CHUNK_CHARS = 20_000;
const MAX_CHUNKS = 40;

export interface ModuleSummary {
  path: string;
  kind: string;
  audience: string;
  purpose: string;
  capabilities: string[];
  apis: string[];
  issues: string[];
}

export interface PreparedModule {
  path: string;
  title: string;
  files: string[];
  endpoints: string[];
  labels: string[];
  components: string[];
  compact: string;
}

export type PreparedDoc =
  | { name: string; chars: number; small: true; text: string }
  | { name: string; chars: number; small: false; digest: string; chunks: string[]; modules: PreparedModule[] };

const cleanSummary = (m: Record<string, unknown>): ModuleSummary => ({
  path: str(m.path, 200),
  kind: str(m.kind, 20),
  audience: str(m.audience, 20),
  purpose: str(m.purpose, 500),
  capabilities: strList(m.capabilities, 10, 200),
  apis: strList(m.apis, 10, 150),
  issues: strList(m.issues, 5, 200),
});

/**
 * Step 1 – Kaveh. Split into short requests so no single request runs long on serverless:
 *   prepare   → read the repo, clean and split the markdown (no AI)
 *   summarize → one AI call per part of a large document (the client runs these in parallel)
 *   finalize  → one AI call that writes the analysis from everything above
 * `analyze` runs all three in one go (fine locally and for small inputs).
 */
@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly github: GithubService,
    private readonly llm: LlmService,
  ) {}

  async prepare(body: AnalyzeBody): Promise<{ repo?: RepoInfo; repoContext: string; doc: PreparedDoc | null; demo: boolean }> {
    const gitUrl = str(body?.gitUrl, 500);
    const markdown = typeof body?.markdown === 'string' ? body.markdown.slice(0, MAX_MARKDOWN) : '';
    const name = str(body?.markdownName, 200) || 'document.md';
    if (!gitUrl && !markdown.trim()) {
      throw new BadRequestException('لینک مخزن گیت یا یک فایل markdown لازم است.');
    }

    let repo: RepoInfo | undefined;
    let repoContext = '';
    if (gitUrl) {
      const r = await this.github.read(gitUrl);
      repo = r.repo;
      repoContext = r.context;
    }

    let doc: PreparedDoc | null = null;
    if (markdown.trim()) {
      const clean = stripAgentBoilerplate(markdown);
      if (clean.length <= SMALL_MARKDOWN) {
        doc = { name, chars: markdown.length, small: true, text: clean };
      } else {
        const mods = splitModules(clean);
        doc = {
          name,
          chars: markdown.length,
          small: false,
          digest: structuralDigest(name, mods, markdown.length),
          chunks: chunkModules(
            mods.filter((m) => m.compact.length > 40),
            CHUNK_CHARS,
          ).slice(0, MAX_CHUNKS),
          modules: mods.map(({ path, title, files, endpoints, labels, components, compact }) => ({
            path,
            title,
            files,
            endpoints,
            labels,
            components,
            compact,
          })),
        };
      }
    }

    return { repo, repoContext, doc, demo: this.llm.isDemo };
  }

  /** One part of a large document → per-module summaries. */
  async summarize(body: { chunk?: unknown }): Promise<{ modules: ModuleSummary[] }> {
    const chunk = clip(body?.chunk, CHUNK_CHARS * 2);
    if (!chunk.trim()) throw new BadRequestException('بخشی برای خلاصه‌سازی ارسال نشده است.');
    if (this.llm.isDemo) return { modules: [] };
    const r = await this.llm.json<Record<string, unknown>>(PROMPTS.chunk, `${COMPACTION_NOTE}\n${chunk}`);
    return { modules: list(r?.modules, 50).map(cleanSummary) };
  }

  /** Builds the agents' context and writes Kaveh's analysis. */
  async finalize(body: {
    repo?: RepoInfo;
    repoContext?: unknown;
    doc?: { name?: unknown; small?: unknown; text?: unknown; digest?: unknown; summaries?: unknown } | null;
  }) {
    const repoContext = clip(body?.repoContext, 60_000);
    const d = body?.doc;
    let docContext = '';
    let docText = '';
    if (d) {
      const name = str(d.name, 200) || 'document.md';
      if (d.small) {
        docText = clip(d.text, SMALL_MARKDOWN * 2);
        docContext = `# MARKDOWN DOCUMENT: ${name}\n${docText}`;
      } else {
        const summaries = list(d.summaries, 400).map(cleanSummary);
        docContext = [this.formatSummaries(summaries), clip(d.digest, 60_000)].filter(Boolean).join('\n\n');
      }
    }
    if (!repoContext && !docContext) throw new BadRequestException('چیزی برای تحلیل وجود ندارد.');

    const context = [repoContext, docContext].filter(Boolean).join('\n\n').slice(0, MAX_CONTEXT);
    const analysis = this.llm.isDemo
      ? mockAnalysis(body?.repo, docText, context)
      : this.clean(await this.llm.json<Record<string, unknown>>(PROMPTS.analysis, context));
    return { analysis, context, demo: this.llm.isDemo };
  }

  /** All three steps in one request (local use / small inputs). */
  async analyze(body: AnalyzeBody) {
    const p = await this.prepare(body);
    const doc = p.doc;
    let summaries: ModuleSummary[] = [];
    if (doc && !doc.small && !this.llm.isDemo) {
      const started = Date.now();
      const results = await mapLimit(doc.chunks, 5, (chunk, i) =>
        this.summarize({ chunk }).catch((err: Error) => {
          this.logger.warn(`Chunk ${i + 1}/${doc.chunks.length} failed: ${err.message}`);
          return null;
        }),
      );
      if (!results.some(Boolean)) throw new BadRequestException('کاوه نتوانست هیچ بخشی از فایل را تحلیل کند. دوباره تلاش کن.');
      summaries = results.flatMap((r) => r?.modules ?? []);
      this.logger.log(`Summarised ${results.filter(Boolean).length}/${results.length} parts in ${Math.round((Date.now() - started) / 1000)}s`);
    }
    const f = await this.finalize({
      repo: p.repo,
      repoContext: p.repoContext,
      doc: doc && (doc.small ? doc : { name: doc.name, small: false, digest: doc.digest, summaries }),
    });
    return {
      repo: p.repo,
      analysis: f.analysis,
      context: f.context,
      document: doc && {
        name: doc.name,
        chars: doc.chars,
        modules: doc.small ? 1 : doc.modules.length,
        summarized: summaries.length,
      },
      demo: this.llm.isDemo,
    };
  }

  private formatSummaries(items: ModuleSummary[]): string {
    if (!items.length) return '';
    const lines = ['# PRODUCT MODULE SUMMARIES (Kaveh read every part of the document)', ''];
    for (const m of items) {
      lines.push(`## ${m.path} — ${m.kind || 'module'} / ${m.audience || '-'}`);
      if (m.purpose) lines.push(`هدف: ${m.purpose}`);
      if (m.capabilities.length) lines.push(`قابلیت‌ها: ${m.capabilities.join('؛ ')}`);
      if (m.apis.length) lines.push(`API: ${m.apis.join(', ')}`);
      if (m.issues.length) lines.push(`ایرادها: ${m.issues.join('؛ ')}`);
      lines.push('');
    }
    return lines.join('\n');
  }

  private clean(a: Record<string, unknown>) {
    return {
      productName: str(a.productName, 120) || 'محصول',
      summary: str(a.summary, 1500),
      techStack: strList(a.techStack, 20, 60),
      modules: strList(a.modules, 12, 120),
      highlights: strList(a.highlights, 8, 300),
    };
  }
}
