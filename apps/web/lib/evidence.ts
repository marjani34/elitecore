import type { DocModule } from "./data";

/**
 * Picks the modules that implement a feature (same logic as the API's findModules):
 * first the paths the Feature Analyst linked, then the modules sharing the most words with the feature.
 */
const words = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9؀-ۿ‌]+/i)
    .map((w) => w.replace(/‌/g, ""))
    .filter((w) => w.length > 2);

export function findModules(mods: DocModule[], paths: string[], text: string, max = 3): DocModule[] {
  const norm = (p: string) => p.trim().toLowerCase().replace(/^\.?\//, "");
  const wanted = paths.map(norm).filter(Boolean);
  const byPath = mods.filter((m) => {
    const p = norm(m.path);
    const files = m.files.map(norm);
    return wanted.some(
      (w) =>
        p === w ||
        p.endsWith(w) ||
        w.endsWith(p) ||
        (w.length > 6 && p.includes(w)) ||
        files.some((f) => f === w || f.endsWith(`/${w}`) || w.endsWith(`/${f}`)),
    );
  });
  if (byPath.length) return byPath.slice(0, max);

  const target = new Set(words(text));
  if (!target.size) return [];
  return mods
    .filter((m) => m.path !== "(intro)")
    .map((m) => ({
      m,
      score: words([m.path, m.title, ...m.labels, ...m.components].join(" ")).reduce((n, w) => n + (target.has(w) ? 1 : 0), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(max, 2))
    .map((x) => x.m);
}

export function moduleCode(mods: DocModule[], limit = 40_000): string {
  return mods
    .map((m) => `===== MODULE: ${m.path} =====\n${m.compact}`)
    .join("\n\n")
    .slice(0, limit);
}

/** Runs async tasks with a concurrency limit; each task is retried once before giving up (null). */
export async function runParallel<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
  onDone?: (doneCount: number) => void,
): Promise<(R | null)[]> {
  const out: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = await fn(items[i], i);
      } catch {
        try {
          out[i] = await fn(items[i], i);
        } catch {
          out[i] = null;
        }
      }
      onDone?.(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
