import { activeCriteria, confirmedFeatures, pct, type Criterion, type Project } from "./data";

export interface Tally {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
}

export function tally(list: Criterion[]): Tally {
  return {
    total: list.length,
    passed: list.filter((c) => c.status === "passed").length,
    failed: list.filter((c) => c.status === "failed").length,
    skipped: list.filter((c) => c.status === "skipped").length,
    pending: list.filter((c) => c.status === "pending").length,
  };
}

export function computeMetrics(p: Project) {
  const features = confirmedFeatures(p);
  const featureIds = new Set(features.map((f) => f.id));
  const journeys = p.journeys.filter((j) => j.checked && featureIds.has(j.featureId));
  const criteria = activeCriteria(p);

  const all = tally(criteria);
  const required = tally(criteria.filter((c) => c.priority === "required"));
  const optional = tally(criteria.filter((c) => c.priority === "optional"));

  const perFeature = features.map((f) => {
    const t = tally(criteria.filter((c) => c.featureId === f.id));
    return {
      feature: f,
      journeys: journeys.filter((j) => j.featureId === f.id).length,
      ...t,
      done: t.total > 0 && t.passed === t.total,
    };
  });

  return {
    features: {
      listed: p.features.length,
      confirmed: features.length,
      required: features.filter((f) => f.priority === "required").length,
      optional: features.filter((f) => f.priority === "optional").length,
      byAi: p.features.filter((f) => f.origin === "ai").length,
      byAdmin: p.features.filter((f) => f.origin === "admin").length,
    },
    journeys: { listed: p.journeys.length, confirmed: journeys.length },
    all,
    required,
    optional,
    /** Share of required criteria that passed — the delivery gate. */
    readiness: pct(required.passed, required.total),
    /** Everything that passed, not counting optional items that were deliberately skipped. */
    completion: pct(all.passed, all.total - optional.skipped),
    optionalSkippedPct: pct(optional.skipped, optional.total),
    ready: required.total > 0 && required.passed === required.total,
    perFeature,
  };
}

export type Metrics = ReturnType<typeof computeMetrics>;
