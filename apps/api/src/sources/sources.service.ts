import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PROMPTS } from '../agents/agents.prompts';
import { mockAnalysis } from '../agents/agents.mock';
import { list, str, strList } from '../common/clean';
import { GithubService, type RepoInfo } from './github.service';
import { chunkModules, COMPACTION_NOTE, mapLimit, splitModules, stripAgentBoilerplate, structuralDigest, type DocModule } from './markdown-digest';

export interface AnalyzeBody {
  gitUrl?: string;
  markdown?: string;
  markdownName?: string;
}

/** What the later agents read (features, review). */
const MAX_CONTEXT = 90_000;
/** Accepted markdown size (the request body limit is 4 MB). */
const MAX_MARKDOWN = 3_000_000;
/** Below this, the cleaned markdown is passed to the agents as is. */
const SMALL_MARKDOWN = 50_000;
/** Size of each part Kaveh summarises separately, and how many run at once. */
const CHUNK_CHARS = 28_000;
const CHUNK_CONCURRENCY = 5;
const MAX_CHUNKS = 40;

interface ModuleSummary {
  path: string;
  kind: string;
  audience: string;
  purpose: string;
  capabilities: string[];
  apis: string[];
  issues: string[];
}

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly github: GithubService,
    private readonly llm: LlmService,
  ) {}

  async analyze(body: AnalyzeBody) {
    const gitUrl = str(body?.gitUrl, 500);
    const markdown = typeof body?.markdown === 'string' ? body.markdown.slice(0, MAX_MARKDOWN) : '';
    const markdownName = str(body?.markdownName, 200) || 'document.md';
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

    const doc = markdown ? await this.digestMarkdown(markdown, markdownName) : undefined;

    const context = [repoContext, doc?.context ?? ''].filter(Boolean).join('\n\n').slice(0, MAX_CONTEXT);

    const analysis = this.llm.isDemo
      ? mockAnalysis(repo, doc?.clean ?? '', context)
      : this.clean(await this.llm.json<Record<string, unknown>>(PROMPTS.analysis, context));

    return {
      repo,
      analysis,
      context,
      document: doc && { name: markdownName, chars: markdown.length, modules: doc.modules, summarized: doc.summarized },
      demo: this.llm.isDemo,
    };
  }

  /**
   * Small documents go to the agents as they are. Large ones (e.g. whole-codebase snapshots)
   * are split into modules; Kaveh summarises every part, so the analysis covers the whole product.
   */
  private async digestMarkdown(markdown: string, name: string) {
    const clean = stripAgentBoilerplate(markdown);
    if (clean.length <= SMALL_MARKDOWN) {
      return { clean, context: `# MARKDOWN DOCUMENT: ${name}\n${clean}`, modules: 1, summarized: 0 };
    }

    const mods = splitModules(clean);
    const digest = structuralDigest(name, mods, markdown.length);
    if (this.llm.isDemo) return { clean, context: digest, modules: mods.length, summarized: 0 };

    const summaries = await this.summarize(mods);
    const context = [this.formatSummaries(summaries), digest].filter(Boolean).join('\n\n');
    return { clean, context, modules: mods.length, summarized: summaries.length };
  }

  private async summarize(mods: DocModule[]): Promise<ModuleSummary[]> {
    const chunks = chunkModules(mods.filter((m) => m.compact.length > 40), CHUNK_CHARS).slice(0, MAX_CHUNKS);
    const started = Date.now();
    const results = await mapLimit(chunks, CHUNK_CONCURRENCY, (chunk, i) =>
      this.llm.json<Record<string, unknown>>(PROMPTS.chunk, `${COMPACTION_NOTE}\n${chunk}`).catch((err: Error) => {
        this.logger.warn(`Chunk ${i + 1}/${chunks.length} failed: ${err.message}`);
        return null;
      }),
    );
    const ok = results.filter(Boolean).length;
    this.logger.log(`Summarised ${ok}/${chunks.length} parts in ${Math.round((Date.now() - started) / 1000)}s`);
    if (!ok) throw new BadRequestException('کاوه نتوانست هیچ بخشی از فایل را تحلیل کند. دوباره تلاش کن.');

    return results.flatMap((r) =>
      list(r?.modules, 50).map((m) => ({
        path: str(m.path, 200),
        kind: str(m.kind, 20),
        audience: str(m.audience, 20),
        purpose: str(m.purpose, 500),
        capabilities: strList(m.capabilities, 10, 200),
        apis: strList(m.apis, 10, 150),
        issues: strList(m.issues, 5, 200),
      })),
    );
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
