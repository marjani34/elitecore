import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { clip, list, priority, str, strList } from '../common/clean';
import { PROMPTS } from './agents.prompts';
import { mockCriteria, mockFeatures, mockJourneys, mockReport, mockReview, type FeatureIn } from './agents.mock';
import { COMPACTION_NOTE, findModules, mapLimit, splitModules, stripAgentBoilerplate } from '../sources/markdown-digest';

/** How much module-summary context the journeys/criteria agents get, and source code per review batch. */
const STEP_CONTEXT = 60_000;
const REVIEW_CODE = 40_000;
const SMALL_MARKDOWN = 50_000;

type Body = Record<string, unknown>;

const VERDICTS = ['likely-pass', 'likely-fail', 'unknown'] as const;
type Verdict = (typeof VERDICTS)[number];

function featuresIn(v: unknown): FeatureIn[] {
  const items = list(v, 60)
    .map((f) => ({
      id: str(f.id, 80),
      title: str(f.title, 200),
      description: str(f.description, 600),
      priority: priority(f.priority),
      modules: strList(f.modules, 5, 200),
    }))
    .filter((f) => f.id && f.title);
  if (!items.length) throw new BadRequestException('هیچ ویژگی تأییدشده‌ای ارسال نشده است.');
  return items;
}

/**
 * Agents for steps 2–6. They are stateless: the client sends the context each time,
 * so this runs fine on serverless (Vercel) until a database is added.
 */
@Injectable()
export class AgentsService {
  constructor(private readonly llm: LlmService) {}

  /** Step 2 – Niloufar lists the features the product already has. */
  async features(b: Body) {
    const context = clip(b.context, 80_000);
    if (this.llm.isDemo) return { demo: true, features: mockFeatures(context) };
    const r = await this.llm.json<Body>(PROMPTS.features, { analysis: b.analysis, context });
    return {
      features: list(r.features, 30)
        .map((f) => ({
          title: str(f.title, 200),
          description: str(f.description, 600),
          priority: priority(f.priority),
          modules: strList(f.modules, 5, 200),
        }))
        .filter((f) => f.title),
    };
  }

  /** Step 3 – Arash writes user journeys for each approved feature. */
  async journeys(b: Body) {
    const features = featuresIn(b.features);
    if (this.llm.isDemo) return { demo: true, journeys: mockJourneys(features) };
    const ids = new Set(features.map((f) => f.id));
    const r = await this.llm.json<Body>(PROMPTS.journeys, { analysis: b.analysis, features, context: clip(b.context, STEP_CONTEXT) });
    return {
      journeys: list(r.journeys, 120)
        .map((j) => ({ featureId: str(j.featureId, 80), title: str(j.title, 200), steps: strList(j.steps, 10, 300) }))
        .filter((j) => ids.has(j.featureId) && j.title),
    };
  }

  /** Step 4 – Sara writes acceptance criteria. */
  async criteria(b: Body) {
    const features = featuresIn(b.features);
    if (this.llm.isDemo) return { demo: true, criteria: mockCriteria(features) };
    const ids = new Set(features.map((f) => f.id));
    const journeys = list(b.journeys, 200).map((j) => ({ featureId: str(j.featureId, 80), title: str(j.title, 200), steps: strList(j.steps, 10, 300) }));
    const r = await this.llm.json<Body>(PROMPTS.criteria, {
      analysis: b.analysis,
      features,
      journeys,
      context: clip(b.context, STEP_CONTEXT),
    });
    return {
      criteria: list(r.criteria, 200)
        .map((c) => ({ featureId: str(c.featureId, 80), text: str(c.text, 800), priority: priority(c.priority) }))
        .filter((c) => ids.has(c.featureId) && c.text),
    };
  }

  /**
   * Step 5 – Behrad pre-reviews each acceptance criterion against the code; the admin makes the final call.
   * For a large markdown snapshot he gets, per feature, the real code of the modules that implement it.
   */
  async review(b: Body) {
    const criteria = list(b.criteria, 200)
      .map((c) => ({
        id: str(c.id, 80),
        text: str(c.text, 800),
        feature: str(c.feature, 200),
        modules: strList(c.modules, 5, 200),
      }))
      .filter((c) => c.id && c.text);
    if (!criteria.length) throw new BadRequestException('هیچ معیاری برای بررسی ارسال نشده است.');
    if (this.llm.isDemo) return { demo: true, reviews: mockReview(criteria) };

    const ids = new Set(criteria.map((c) => c.id));
    const markdown = typeof b.markdown === 'string' ? b.markdown.slice(0, 3_000_000) : '';
    const context = clip(b.context, 70_000);

    // The client may send one feature group with that feature's code already selected (short request).
    const sourceCode = clip(b.sourceCode, REVIEW_CODE + 5_000);

    let raw: Body[];
    if (sourceCode) {
      const r = await this.llm.json<Body>(PROMPTS.review, {
        analysis: b.analysis,
        feature: str(b.feature, 200),
        note: COMPACTION_NOTE,
        sourceCode,
        criteria: criteria.map(({ id, text }) => ({ id, text })),
      });
      raw = list(r.reviews, 200);
    } else if (markdown.length > SMALL_MARKDOWN) {
      // Review feature by feature, each with the source code of its own modules.
      const mods = splitModules(stripAgentBoilerplate(markdown));
      const groups = new Map<string, typeof criteria>();
      for (const c of criteria) groups.set(c.feature, [...(groups.get(c.feature) ?? []), c]);
      const results = await mapLimit([...groups.entries()], 4, async ([feature, items]) => {
        const picked = findModules(mods, items.flatMap((c) => c.modules), feature);
        const code = picked
          .map((m) => `===== MODULE: ${m.path} =====\n${m.compact}`)
          .join('\n\n')
          .slice(0, REVIEW_CODE);
        const input = {
          analysis: b.analysis,
          feature,
          note: COMPACTION_NOTE,
          sourceCode: code || '(no matching module found in the document)',
          criteria: items.map(({ id, text }) => ({ id, text })),
        };
        return this.llm.json<Body>(PROMPTS.review, input).catch(() => ({ reviews: [] }) as Body);
      });
      raw = results.flatMap((r) => list(r.reviews, 200));
    } else {
      const r = await this.llm.json<Body>(PROMPTS.review, {
        analysis: b.analysis,
        sourceCode: markdown || context,
        context: markdown ? context : undefined,
        criteria: criteria.map(({ id, text, feature }) => ({ id, text, feature })),
      });
      raw = list(r.reviews, 200);
    }

    return {
      reviews: raw
        .map((x) => ({
          id: str(x.id, 80),
          verdict: (VERDICTS.includes(x.verdict as Verdict) ? x.verdict : 'unknown') as Verdict,
          reason: str(x.reason, 400),
        }))
        .filter((x) => ids.has(x.id)),
    };
  }

  /** Step 6 – Mahsa writes the delivery report summary from the final numbers. */
  async report(b: Body) {
    const metrics = (b.metrics && typeof b.metrics === 'object' ? b.metrics : {}) as Parameters<typeof mockReport>[0];
    if (this.llm.isDemo) return { demo: true, ...mockReport(metrics) };
    const r = await this.llm.json<Body>(PROMPTS.report, { metrics, features: b.features, criteria: b.criteria });
    return {
      summary: str(r.summary, 2000),
      recommendation: str(r.recommendation, 600),
      risks: strList(r.risks, 8, 300),
    };
  }
}
