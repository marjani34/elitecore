import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RepoInfo {
  provider: 'github' | 'other';
  url: string;
  fullName?: string;
  description?: string;
  defaultBranch?: string;
  stars?: number;
  languages: string[];
  fileCount: number;
  keyFiles: string[];
}

const IGNORED = /(^|\/)(node_modules|dist|build|out|\.next|\.git|vendor|coverage|\.turbo|\.vercel|__pycache__)\//;
const BINARY = /\.(png|jpe?g|gif|svg|ico|webp|avif|mp4|mp3|woff2?|ttf|eot|otf|pdf|zip|gz|lock)$/i;
const MAX_TREE = 500;
const MAX_FILE = 6000;

export function parseGithubUrl(url: string): { owner: string; repo: string; ref?: string } | null {
  const u = url.trim();
  const ssh = u.match(/^git@github\.com:([^/]+)\/(.+?)(\.git)?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  const m = u.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:\/tree\/([^#?]+))?\/?(?:[#?].*)?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2], ref: m[3] };
}

/** Reads a GitHub repository (meta, file tree, key files) and turns it into text context for the agents. */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly config: ConfigService) {}

  private headers(): Record<string, string> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    return {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'elite-delivery-agent',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async get<T>(url: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(20_000) });
    } catch (err) {
      this.logger.error(`GitHub request failed: ${String(err)}`);
      throw new BadRequestException('اتصال به GitHub برقرار نشد.');
    }
    if (res.status === 404) {
      throw new BadRequestException('مخزن پیدا نشد. اگر مخزن خصوصی است، GITHUB_TOKEN را روی سرور تنظیم کن.');
    }
    if (res.status === 403 || res.status === 429) {
      throw new BadRequestException('محدودیت درخواست GitHub پر شده است. GITHUB_TOKEN را روی سرور تنظیم کن یا کمی بعد امتحان کن.');
    }
    if (!res.ok) throw new BadRequestException(`GitHub خطا داد (${res.status}).`);
    return (await res.json()) as T;
  }

  private async raw(owner: string, repo: string, ref: string, path: string): Promise<string> {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path.split('/').map(encodeURIComponent).join('/')}`,
        { headers: this.headers(), signal: AbortSignal.timeout(15_000) },
      );
      if (!res.ok) return '';
      return (await res.text()).slice(0, MAX_FILE);
    } catch {
      return '';
    }
  }

  async read(url: string): Promise<{ repo: RepoInfo; context: string }> {
    const parsed = parseGithubUrl(url);
    if (!parsed) {
      return {
        repo: { provider: 'other', url, languages: [], fileCount: 0, keyFiles: [] },
        context: `# REPOSITORY\nURL: ${url}\n(Only GitHub repositories can be read automatically. Rely on the markdown document.)`,
      };
    }

    const { owner, repo } = parsed;
    const meta = await this.get<{
      full_name: string;
      description: string | null;
      default_branch: string;
      stargazers_count: number;
      html_url: string;
    }>(`https://api.github.com/repos/${owner}/${repo}`);
    const ref = parsed.ref || meta.default_branch;

    const [tree, languages] = await Promise.all([
      this.get<{ tree: { path: string; type: string }[]; truncated?: boolean }>(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      ),
      this.get<Record<string, number>>(`https://api.github.com/repos/${owner}/${repo}/languages`).catch(() => ({})),
    ]);

    const files = tree.tree
      .filter((t) => t.type === 'blob' && !IGNORED.test(`${t.path}/`) && !IGNORED.test(t.path) && !BINARY.test(t.path))
      .map((t) => t.path);

    const keyFiles = pickKeyFiles(files);
    const contents = await Promise.all(keyFiles.map((p) => this.raw(owner, repo, ref, p)));

    const langNames = Object.keys(languages);
    const context = [
      '# REPOSITORY',
      `Name: ${meta.full_name}`,
      `Description: ${meta.description ?? '-'}`,
      `Languages: ${langNames.join(', ') || '-'}`,
      `Default branch: ${ref}`,
      `Stars: ${meta.stargazers_count}`,
      '',
      `# FILE TREE (${files.length} files${files.length > MAX_TREE ? `, first ${MAX_TREE} shown` : ''})`,
      ...files.slice(0, MAX_TREE),
      '(end of tree)',
      '',
      ...keyFiles.flatMap((p, i) => (contents[i] ? [`# FILE: ${p}`, contents[i], ''] : [])),
    ].join('\n');

    return {
      repo: {
        provider: 'github',
        url: meta.html_url,
        fullName: meta.full_name,
        description: meta.description ?? undefined,
        defaultBranch: ref,
        stars: meta.stargazers_count,
        languages: langNames.slice(0, 8),
        fileCount: files.length,
        keyFiles: keyFiles.filter((_, i) => contents[i]),
      },
      context,
    };
  }
}

/** README, manifests, docs, schemas and route/controller files say the most about a product. */
function pickKeyFiles(files: string[]): string[] {
  const picked: string[] = [];
  const add = (p?: string) => p && !picked.includes(p) && picked.push(p);
  const depth = (p: string) => p.split('/').length;

  add(files.find((f) => /^readme(\.md|\.markdown|\.txt)?$/i.test(f)));
  files.filter((f) => /(^|\/)package\.json$/.test(f)).sort((a, b) => depth(a) - depth(b)).slice(0, 4).forEach(add);
  ['composer.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'pubspec.yaml', 'Gemfile', 'pom.xml'].forEach((n) =>
    add(files.find((f) => f === n)),
  );
  add(files.find((f) => /schema\.prisma$/.test(f)));
  add(files.find((f) => /(openapi|swagger)\.(ya?ml|json)$/i.test(f)));
  files.filter((f) => /^docs?\/.+\.md$/i.test(f)).slice(0, 3).forEach(add);
  files
    .filter((f) => /\.(controller|routes?|router)\.(t|j)s$/.test(f) || /(^|\/)routes?\.(t|j)sx?$/.test(f))
    .slice(0, 4)
    .forEach(add);
  return picked.slice(0, 14);
}
