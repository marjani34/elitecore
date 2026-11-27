/**
 * Turns a (possibly huge) markdown document into something the agents can actually read.
 *
 * Typical big input: a "code snapshot" bundle — many modules, each with its files in fenced
 * code blocks — often 1 MB+. Sending only the first N characters loses most of the product, so:
 *   1. strip boilerplate aimed at other AI tools ("Instructions for the LLM" blocks),
 *   2. split into modules (bundle markers like  ## `path/to/module.md`)  or into heading sections,
 *   3. compact code (imports, comments, SVG, CSS classes, long literals, blank lines),
 *   4. extract cheap signals per module (files, API endpoints, Persian UI labels, components),
 *   5. pack the compacted modules into chunks the AI can summarise one by one.
 */

export interface DocModule {
  path: string;
  title: string;
  files: string[];
  endpoints: string[];
  labels: string[];
  components: string[];
  rawChars: number;
  compact: string;
}

const MODULE_MARKER = /^#{1,3}\s+`([^`\n]+)`\s*$/m;
const MODULE_SPLIT = /^#{1,3}\s+`([^`\n]+)`\s*$/gm;

/** Removes instruction blocks other tools embed for LLMs (they can hijack our agents' output format). */
export function stripAgentBoilerplate(md: string): string {
  return md
    // Block ends at the next '---' rule or at the next heading that isn't part of it.
    .replace(/#{1,4}\s*Instructions for the LLM[\s\S]*?(?=^---|^#{1,3}\s+(?!JSON Template)(?!Rules)\S)/gim, '')
    .replace(/^---(?=#)/gm, '')
    .replace(/^#\s*Project Code Snapshot \(for AI agents\)\s*$/gim, '');
}

export function compactCode(text: string): string {
  return text
    .replace(/^\s*`{3,}[^\n]*$/gm, '')
    .replace(/^\s*import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^\n]*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/[^\n]*$/gm, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')
    .replace(/\b(d|viewBox|points|fill|stroke)="[^"]*"/g, '')
    .replace(/\b(className|class|style)=("[^"]*"|\{`[^`\n]*`\}|\{\{[^}]*\}\})/g, '')
    .replace(/"[^"\n]{160,}"/g, '"…"')
    .replace(/'[^'\n]{160,}'/g, "'…'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

const uniq = (xs: string[], max: number) => Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean))).slice(0, max);

function signals(body: string) {
  const files = uniq([...body.matchAll(/^#{2,4}\s+([^\s`#][^\n]{0,80}\.[a-z]{1,5})\s*$/gim)].map((m) => m[1]), 30);
  const endpoints = uniq(
    [...body.matchAll(/["'`]((?:ds|fr|api|v\d)\/[A-Za-z0-9_\-/.:]{3,}|\/api\/[A-Za-z0-9_\-/.:]{2,}|https?:\/\/[^\s"'`]{6,})["'`]/g)].map(
      (m) => m[1],
    ),
    25,
  ).filter((e) => !/w3\.org|cdn\.|jsdelivr|unpkg|fonts\.googleapis|file-get|\.(png|jpe?g|webp|gif|svg|js|css|apk)(\?|$)/i.test(e));
  const labels = uniq(
    [...body.matchAll(/[؀-ۿ][؀-ۿ‌0-9۰-۹ ()،:؟!\-]{2,60}[؀-ۿ)]/g)].map((m) => m[0]),
    40,
  );
  const components = uniq(
    [...body.matchAll(/export\s+(?:default\s+)?(?:const|function|class)\s+([A-Z][A-Za-z0-9_]+)/g)].map((m) => m[1]),
    15,
  );
  return { files, endpoints, labels, components };
}

/** Splits into modules: bundle markers if present, otherwise top-level heading sections. */
export function splitModules(md: string): DocModule[] {
  const make = (path: string, body: string): DocModule => {
    const s = signals(body);
    const title =
      s.labels.find((l) => /^(مدیریت|داشبورد|پنل|صفحه|لیست|فهرست|تاریخچه|تنظیمات|پروفایل|گزارش|سفارش|پرداخت)/.test(l)) ??
      s.labels.find((l) => l.includes(' ')) ??
      s.labels[0] ??
      '';
    return { path, title, ...s, rawChars: body.length, compact: compactCode(body) };
  };

  if (MODULE_MARKER.test(md) && (md.match(MODULE_SPLIT)?.length ?? 0) >= 2) {
    const parts = md.split(MODULE_SPLIT);
    const out: DocModule[] = [];
    if (parts[0].trim().length > 200) out.push(make('(intro)', parts[0]));
    for (let i = 1; i < parts.length; i += 2) out.push(make(parts[i], parts[i + 1] ?? ''));
    return out;
  }

  const sections = md.split(/^(?=#{1,2}\s+\S)/m).filter((s) => s.trim());
  return sections.map((s, i) => make(s.match(/^#{1,2}\s+(.+)$/m)?.[1]?.trim() ?? `section-${i + 1}`, s));
}

/** Short, cheap overview of every module — works without the AI (demo mode) and anchors the AI's summary. */
export function structuralDigest(name: string, mods: DocModule[], totalChars: number): string {
  const lines = [
    `# MARKDOWN DOCUMENT: ${name} (${Math.round(totalChars / 1024)} KB, ${mods.length} modules — digested)`,
    '',
    '# FILE TREE',
    ...mods.map((m) => m.path),
    '(end of tree)',
    '',
  ];
  for (const m of mods) {
    lines.push(`### MODULE: ${m.path}${m.title ? ` | ${m.title}` : ''}`);
    if (m.files.length) lines.push(`files: ${m.files.join(', ')}`);
    if (m.components.length) lines.push(`components: ${m.components.join(', ')}`);
    if (m.endpoints.length) lines.push(`api: ${m.endpoints.join(', ')}`);
    if (m.labels.length) lines.push(`ui text: ${m.labels.slice(0, 25).join(' · ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Packs compacted modules into chunks (a module bigger than the limit is split on its own). */
export function chunkModules(mods: DocModule[], maxChars: number): string[] {
  const chunks: string[] = [];
  let cur = '';
  const push = () => {
    if (cur.trim()) chunks.push(cur);
    cur = '';
  };
  for (const m of mods) {
    const block = `\n===== MODULE: ${m.path} =====\n${m.compact}\n`;
    if (block.length > maxChars) {
      push();
      for (let i = 0; i < block.length; i += maxChars) {
        chunks.push(`${i ? `\n===== MODULE: ${m.path} (continued) =====\n` : ''}${block.slice(i, i + maxChars)}`);
      }
      continue;
    }
    if (cur.length + block.length > maxChars) push();
    cur += block;
  }
  push();
  return chunks;
}

/** Runs async tasks with a concurrency limit, keeping result order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
