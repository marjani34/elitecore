/** Helpers that turn untrusted AI / client JSON into safe values. */

export const str = (v: unknown, max = 2000): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '';

export const strList = (v: unknown, maxItems = 30, maxLen = 400): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];

export const list = (v: unknown, maxItems = 200): Record<string, unknown>[] =>
  Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object').slice(0, maxItems)
    : [];

export type Priority = 'required' | 'optional';
export const priority = (v: unknown): Priority => (v === 'optional' ? 'optional' : 'required');

export const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.slice(0, max) : '');
