import { BadRequestException, Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { clip, list, priority, str, strList } from '../common/clean';
import { PROMPTS } from './agents.prompts';
import { mockCriteria, mockFeatures, mockJourneys, mockReport, mockReview, type FeatureIn } from './agents.mock';

type Body = Record<string, unknown>;

const VERDICTS = ['likely-pass', 'likely-fail', 'unknown'] as const;
type Verdict = (typeof VERDICTS)[number];

function featuresIn(v: unknown): FeatureIn[] {
  const items = list(v, 60)
    .map((f) => ({ id: str(f.id, 80), title: str(f.title, 200), description: str(f.description, 600), priority: priority(f.priority) }))
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
        .map((f) => ({ title: str(f.title, 200), description: str(f.description, 600), priority: priority(f.priority) }))
        .filter((f) => f.title),
    };
  }

  /** Step 3 – Arash writes user journeys for each approved feature. */
  async journeys(b: Body) {
    const features = featuresIn(b.features);
    if (this.llm.isDemo) return { demo: true, journeys: mockJourneys(features) };
    const ids = new Set(features.map((f) => f.id));
    const r = await this.llm.json<Body>(PROMPTS.journeys, { analysis: b.analysis, features });
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
    const r = await this.llm.json<Body>(PROMPTS.criteria, { analysis: b.analysis, features, journeys });
    return {
      criteria: list(r.criteria, 200)
        .map((c) => ({ featureId: str(c.featureId, 80), text: str(c.text, 800), priority: priority(c.priority) }))
        .filter((c) => ids.has(c.featureId) && c.text),
    };
  }

  /** Step 5 – Behrad pre-reviews each acceptance criterion against the code; the admin makes the final call. */
  async review(b: Body) {
    const criteria = list(b.criteria, 200)
      .map((c) => ({ id: str(c.id, 80), text: str(c.text, 800), feature: str(c.feature, 200) }))
      .filter((c) => c.id && c.text);
    if (!criteria.length) throw new BadRequestException('هیچ معیاری برای بررسی ارسال نشده است.');
    if (this.llm.isDemo) return { demo: true, reviews: mockReview(criteria) };
    const ids = new Set(criteria.map((c) => c.id));
    const r = await this.llm.json<Body>(PROMPTS.review, { analysis: b.analysis, context: clip(b.context, 70_000), criteria });
    return {
      reviews: list(r.reviews, 200)
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
