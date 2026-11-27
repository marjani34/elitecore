/**
 * Demo-mode agents, used when OPENAI_API_KEY is not set.
 * They derive what they can from the real repository context so the flow still feels meaningful.
 */
import type { Priority } from '../common/clean';
import type { RepoInfo } from '../sources/github.service';

export interface FeatureIn {
  id: string;
  title: string;
  description?: string;
  priority?: Priority;
}

const GENERIC_HEADINGS =
  /install|setup|getting started|license|contribut|usage|deploy|test|requirement|table of contents|prerequisite|changelog|author|support|faq|acknowledg|نصب|مجوز|راه[‌ ]?اندازی|پیش[‌ ]?نیاز|مشارکت/i;

function treeOf(context: string): string[] {
  const start = context.indexOf('# FILE TREE');
  if (start < 0) return [];
  const end = context.indexOf('(end of tree)', start);
  return context
    .slice(start, end < 0 ? undefined : end)
    .split('\n')
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Modules from a large-document digest: "### MODULE: path | title". */
function digestModulesOf(context: string): { path: string; title: string; name: string }[] {
  return [...context.matchAll(/^### MODULE: ([^|\n]+?)(?: \| ([^\n]+))?$/gm)]
    .map((m) => {
      const path = m[1].trim();
      const name = path.split('/').pop()?.replace(/\.(md|markdown|txt)$/i, '') ?? path;
      const t = (m[2] ?? '').trim();
      // Only keep labels that read like a page title; otherwise fall back to the module name.
      const title = /^(مدیریت|داشبورد|پنل|صفحه|لیست|فهرست|تاریخچه|تنظیمات|پروفایل|گزارش|سفارش|پرداخت|اشتراک|دستیار)/.test(t) ? t : '';
      return { path, title, name: name.replace(/([a-z])([A-Z])/g, '$1 $2') };
    })
    .filter((m) => m.path !== '(intro)');
}

function headingsOf(context: string): string[] {
  return context
    .split('\n')
    .map((l) => l.match(/^#{2,3}\s+(.+?)\s*#*$/)?.[1]?.replace(/[`*_[\]]/g, '').trim())
    .filter(
      (h): h is string =>
        !!h && h.length > 2 && h.length < 60 && !GENERIC_HEADINGS.test(h) && !/^MODULE:|\.[a-z]{1,5}$/i.test(h),
    );
}

const TECH: [RegExp, string][] = [
  [/"next"\s*:/, 'Next.js'],
  [/"react"\s*:|from\s+['"]react['"]/, 'React'],
  [/react-router/, 'React Router'],
  [/"vue"\s*:/, 'Vue'],
  [/"@angular\/core"/, 'Angular'],
  [/"@nestjs\/core"/, 'NestJS'],
  [/"express"\s*:/, 'Express'],
  [/"tailwindcss"|tailwindcss/i, 'Tailwind CSS'],
  [/"prisma"|schema\.prisma/, 'Prisma'],
  [/"typeorm"/, 'TypeORM'],
  [/"mongoose"/, 'MongoDB'],
  [/"pg"\s*:|postgres/i, 'PostgreSQL'],
  [/"redis"|ioredis/, 'Redis'],
  [/django/i, 'Django'],
  [/laravel/i, 'Laravel'],
  [/pubspec\.yaml/, 'Flutter'],
  [/go\.mod/, 'Go'],
];

export function mockAnalysis(repo: RepoInfo | undefined, markdown: string, context: string) {
  const tree = treeOf(context);
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const productName = firstHeading || repo?.fullName?.split('/')[1] || 'محصول';
  const firstParagraph = markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|-|\*|\[|`|\||>)/.test(p) && p.length > 40);
  const docModules = digestModulesOf(context);

  const techStack = Array.from(new Set([...(repo?.languages ?? []), ...TECH.filter(([re]) => re.test(context) || re.test(markdown)).map(([, n]) => n)]));
  const tops = Array.from(
    new Set(
      tree
        .map((p) => p.split('/'))
        .filter((parts) => parts.length > 1)
        .map((parts) => (['src', 'apps', 'packages', 'app'].includes(parts[0]) && parts.length > 2 ? parts[1] : parts[0])),
    ),
  ).slice(0, 8);

  return {
    productName,
    summary:
      repo?.description ||
      firstParagraph?.slice(0, 400) ||
      `محصول «${productName}» بر اساس سورس‌کد و مستندات ارسال‌شده بررسی شد.`,
    techStack: techStack.length ? techStack : ['نامشخص'],
    modules: docModules.length
      ? docModules.slice(0, 12).map((m) => (m.title ? `${m.title} (${m.name})` : m.name))
      : tops.length
        ? tops
        : headingsOf(context).slice(0, 6),
    highlights: [
      ...(docModules.length ? [`سند شامل ${docModules.length} ماژول است که همه فهرست و خلاصه‌برداری ساختاری شدند.`] : []),
      repo?.provider === 'github' ? `مخزن شامل ${repo.fileCount} فایل است.` : 'سورس‌کد به‌صورت خودکار خوانده نشد؛ تحلیل بر پایه مستندات است.',
      repo?.keyFiles.length ? `فایل‌های کلیدی بررسی‌شده: ${repo.keyFiles.slice(0, 4).join('، ')}` : 'فایل کلیدی برای بررسی پیدا نشد.',
      markdown ? 'مستندات markdown ضمیمه و بررسی شد.' : 'مستندات markdown ضمیمه نشده است.',
      '(حالت نمایشی: با کلید ChatGPT تحلیل دقیق‌تری انجام می‌شود.)',
    ],
  };
}

const FALLBACK_FEATURES: [string, string][] = [
  ['ورود و احراز هویت کاربران', 'کاربر می‌تواند ثبت‌نام کند، وارد شود و از حساب خود خارج شود.'],
  ['داشبورد اصلی', 'کاربر خلاصه‌ای از وضعیت و اطلاعات مهم را در یک صفحه می‌بیند.'],
  ['مدیریت کاربران', 'ادمین می‌تواند کاربران را ببیند، ویرایش یا غیرفعال کند.'],
  ['جست‌وجو و فیلتر', 'کاربر می‌تواند اطلاعات را جست‌وجو و فیلتر کند.'],
  ['اعلان‌ها', 'کاربر از رویدادهای مهم مطلع می‌شود.'],
  ['تنظیمات حساب', 'کاربر می‌تواند اطلاعات و ترجیحات حساب خود را تغییر دهد.'],
];

export function mockFeatures(context: string) {
  const tree = treeOf(context);
  const found: { title: string; description: string }[] = [];
  const seen = new Set<string>();
  const push = (title: string, description: string) => {
    const k = title.toLowerCase();
    if (seen.has(k) || found.length >= 15) return;
    seen.add(k);
    found.push({ title, description });
  };

  const docModules = digestModulesOf(context);
  for (const m of docModules) {
    if (/(^|\/)(pages?|screens?|views?|routes?)\//i.test(m.path)) {
      push(m.title || `بخش ${m.name}`, `بر اساس ماژول ${m.path} شناسایی شد.`);
    }
  }
  if (!docModules.length) headingsOf(context).forEach((h) => push(h, 'بر اساس مستندات محصول شناسایی شد.'));
  for (const p of tree) {
    const route = p.match(/(?:^|\/)(?:app|pages)\/([^/(\[_][^/]*)\/(?:.*\/)?(?:page|index)\.(?:t|j)sx?$/);
    if (route) push(`بخش ${route[1]}`, `بر اساس مسیر ${p} شناسایی شد.`);
    const ctrl = p.match(/([A-Za-z0-9-]+)\.controller\.(?:t|j)s$/);
    if (ctrl && ctrl[1] !== 'app') push(`مدیریت ${ctrl[1]}`, `بر اساس فایل ${p} شناسایی شد.`);
  }
  for (const [t, d] of FALLBACK_FEATURES) if (found.length < 5) push(t, d);

  const requiredCount = Math.ceil(found.length * 0.6);
  return found.map((f, i) => ({ ...f, priority: (i < requiredCount ? 'required' : 'optional') as Priority }));
}

export function mockJourneys(features: FeatureIn[]) {
  return features.flatMap((f) => [
    {
      featureId: f.id,
      title: `استفاده اصلی از «${f.title}»`,
      steps: ['کاربر وارد سامانه می‌شود', `به بخش «${f.title}» می‌رود`, 'اقدام اصلی این بخش را انجام می‌دهد', 'نتیجه را مشاهده و تأیید می‌کند'],
    },
    ...(f.priority === 'required'
      ? [
          {
            featureId: f.id,
            title: `رفتار در خطا برای «${f.title}»`,
            steps: [`کاربر در بخش «${f.title}» اطلاعات نادرست وارد می‌کند`, 'سامانه پیام خطای روشن نشان می‌دهد', 'کاربر اطلاعات را اصلاح و دوباره ارسال می‌کند'],
          },
        ]
      : []),
  ]);
}

export function mockCriteria(features: FeatureIn[]) {
  return features.flatMap((f) => [
    {
      featureId: f.id,
      priority: (f.priority ?? 'required') as Priority,
      text: `با فرض اینکه کاربر وارد شده است، وقتی بخش «${f.title}» را باز می‌کند، آنگاه اطلاعات بدون خطا و در کمتر از ۳ ثانیه نمایش داده می‌شود.`,
    },
    {
      featureId: f.id,
      priority: (f.priority ?? 'required') as Priority,
      text: `با فرض اینکه کاربر در «${f.title}» ورودی نامعتبر می‌دهد، وقتی آن را ارسال می‌کند، آنگاه پیام خطای واضح نمایش داده می‌شود و داده‌ای خراب نمی‌شود.`,
    },
    {
      featureId: f.id,
      priority: 'optional' as Priority,
      text: `با فرض اینکه کاربر با موبایل وارد شده است، وقتی از «${f.title}» استفاده می‌کند، آنگاه صفحه به‌درستی و واکنش‌گرا نمایش داده می‌شود.`,
    },
  ]);
}

export function mockReview(criteria: { id: string }[]) {
  return criteria.map((c) => ({
    id: c.id,
    verdict: 'unknown' as const,
    reason: 'در حالت نمایشی بررسی خودکار کد انجام نمی‌شود؛ این مورد را دستی بررسی کن.',
  }));
}

export function mockReport(m: {
  productName?: string;
  readiness?: number;
  required?: { total?: number; passed?: number; failed?: number; skipped?: number };
  optional?: { total?: number; passed?: number; skipped?: number };
}) {
  const r = m.required ?? {};
  const o = m.optional ?? {};
  const ready = (r.total ?? 0) > 0 && r.passed === r.total;
  return {
    summary:
      `در بررسی «${m.productName ?? 'محصول'}»، از ${r.total ?? 0} معیار ضروری ${r.passed ?? 0} مورد پذیرفته شد (${m.readiness ?? 0}٪ آمادگی). ` +
      `از ${o.total ?? 0} معیار اختیاری ${o.passed ?? 0} مورد پذیرفته و ${o.skipped ?? 0} مورد صرف‌نظر شد.`,
    recommendation: ready
      ? 'همه معیارهای ضروری پذیرفته شده‌اند؛ محصول آماده تحویل به کارفرما است.'
      : 'پیش از تحویل، معیارهای ضروری ردشده یا صرف‌نظرشده باید اصلاح و دوباره بررسی شوند.',
    risks: [
      ...((r.failed ?? 0) > 0 ? [`${r.failed} معیار ضروری رد شده است.`] : []),
      ...((r.skipped ?? 0) > 0 ? [`${r.skipped} معیار ضروری بررسی نشده و صرف‌نظر شده است.`] : []),
      'این گزارش در حالت نمایشی تهیه شده است.',
    ],
  };
}
