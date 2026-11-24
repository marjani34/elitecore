import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { PROMPTS } from '../agents/agents.prompts';
import { mockAnalysis } from '../agents/agents.mock';
import { str, strList } from '../common/clean';
import { GithubService, type RepoInfo } from './github.service';

export interface AnalyzeBody {
  gitUrl?: string;
  markdown?: string;
  markdownName?: string;
}

const MAX_CONTEXT = 80_000;
const MAX_MARKDOWN = 60_000;

@Injectable()
export class SourcesService {
  constructor(
    private readonly github: GithubService,
    private readonly llm: LlmService,
  ) {}

  async analyze(body: AnalyzeBody) {
    const gitUrl = str(body?.gitUrl, 500);
    const markdown = typeof body?.markdown === 'string' ? body.markdown.slice(0, MAX_MARKDOWN) : '';
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

    const context = [
      repoContext,
      markdown ? `# MARKDOWN DOCUMENT: ${str(body.markdownName, 200) || 'document.md'}\n${markdown}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, MAX_CONTEXT);

    const analysis = this.llm.isDemo
      ? mockAnalysis(repo, markdown, context)
      : this.clean(await this.llm.json<Record<string, unknown>>(PROMPTS.analysis, context));

    return { repo, analysis, context, demo: this.llm.isDemo };
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
