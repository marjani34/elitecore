/* ---------- Core types ---------- */

export type StepKey = "source" | "features" | "journeys" | "criteria" | "approval" | "report";
export type ApprovableStep = Exclude<StepKey, "report">;
export type AgentKey = "scout" | "feature" | "journey" | "criteria" | "qa" | "reporter";
export type Priority = "required" | "optional";
export type Origin = "ai" | "admin";
export type AcStatus = "pending" | "passed" | "failed" | "skipped";
export type AiVerdict = "likely-pass" | "likely-fail" | "unknown";

export interface RepoInfo {
  provider: "github" | "other";
  url: string;
  fullName?: string;
  description?: string;
  defaultBranch?: string;
  stars?: number;
  languages: string[];
  fileCount: number;
  keyFiles: string[];
}

export interface Analysis {
  productName: string;
  summary: string;
  techStack: string[];
  modules: string[];
  highlights: string[];
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  checked: boolean;
  origin: Origin;
  /** Module / file paths in the source that implement this feature (evidence for the next agents). */
  modules?: string[];
}

export interface Journey {
  id: string;
  featureId: string;
  title: string;
  steps: string[];
  checked: boolean;
  origin: Origin;
}

export interface Criterion {
  id: string;
  featureId: string;
  text: string;
  priority: Priority;
  origin: Origin;
  status: AcStatus;
  aiVerdict?: AiVerdict;
  aiReason?: string;
  /** Who set the current status: Behrad's suggestion (pre-selected) or the admin. */
  decidedBy?: "ai" | "admin";
}

export interface Report {
  summary: string;
  recommendation: string;
  risks: string[];
  generatedAt: number;
}

export interface Activity {
  id: string;
  actor: AgentKey | "admin";
  text: string;
  at: number;
  kind: "info" | "done" | "error" | "admin";
}

export interface Source {
  gitUrl: string;
  markdown: string;
  markdownName: string;
  context?: string;
  repo?: RepoInfo;
  analyzedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  source: Source;
  analysis?: Analysis;
  features: Feature[];
  journeys: Journey[];
  criteria: Criterion[];
  approved: Record<ApprovableStep, boolean>;
  report?: Report;
  activity: Activity[];
  demo?: boolean;
}

export interface Session {
  token: string;
  user: { email: string; name: string; role: "admin" };
}

/* ---------- Helpers ---------- */

export const fa = (n: number) => n.toLocaleString("fa-IR");
export const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const timeFa = (t: number) =>
  new Date(t).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

/* ---------- Steps ---------- */

export const STEPS: { key: StepKey; title: string; short: string }[] = [
  { key: "source", title: "منبع محصول", short: "افزودن سورس‌کد و مستندات و تحلیل محصول" },
  { key: "features", title: "ویژگی‌ها", short: "فهرست ویژگی‌های موجود محصول و تأیید آن‌ها" },
  { key: "journeys", title: "سفرهای کاربر", short: "سفرهای کاربر برای هر ویژگی تأییدشده" },
  { key: "criteria", title: "معیارهای پذیرش", short: "تعریف معیارهای پذیرش هر ویژگی" },
  { key: "approval", title: "تأیید معیارها", short: "بررسی و تأیید یک‌به‌یک معیارهای پذیرش" },
  { key: "report", title: "گزارش نهایی", short: "گزارش کامل آمادگی محصول برای تحویل" },
];
export const STEP_ORDER = STEPS.map((s) => s.key);
export const stepIndex = (k: StepKey) => STEP_ORDER.indexOf(k);
export const stepMeta = (k: StepKey) => STEPS[stepIndex(k)];

export function createProject(): Project {
  return {
    id: newId(),
    name: "محصول جدید",
    createdAt: Date.now(),
    source: { gitUrl: "", markdown: "", markdownName: "" },
    features: [],
    journeys: [],
    criteria: [],
    approved: { source: false, features: false, journeys: false, criteria: false, approval: false },
    activity: [],
  };
}

export const confirmedFeatures = (p: Project) => p.features.filter((f) => f.checked);

/** Criteria that belong to confirmed features (the only ones that count). */
export function activeCriteria(p: Project) {
  const ids = new Set(confirmedFeatures(p).map((f) => f.id));
  return p.criteria.filter((c) => ids.has(c.featureId));
}

export function stepDone(p: Project, k: StepKey): boolean {
  return k === "report" ? !!p.report : p.approved[k];
}

export function stepUnlocked(p: Project, k: StepKey): boolean {
  return STEP_ORDER.slice(0, stepIndex(k)).every((s) => stepDone(p, s));
}

export function hasOutput(p: Project, k: StepKey): boolean {
  switch (k) {
    case "source":
      return !!p.analysis;
    case "features":
      return p.features.length > 0;
    case "journeys":
      return p.journeys.length > 0;
    case "criteria":
      return p.criteria.length > 0;
    case "approval":
      return activeCriteria(p).some((c) => !!c.aiVerdict || c.status !== "pending");
    case "report":
      return !!p.report;
  }
}

export function currentStep(p: Project): StepKey {
  return STEP_ORDER.find((s) => !stepDone(p, s)) ?? "report";
}

/** Re-open a step for editing: it and every later step lose their approval. */
export function reopenFrom(p: Project, k: ApprovableStep): Project {
  const idx = stepIndex(k);
  const approved = { ...p.approved };
  (Object.keys(approved) as ApprovableStep[]).forEach((s) => {
    if (stepIndex(s) >= idx) approved[s] = false;
  });
  return { ...p, approved, report: undefined };
}

export function addActivity(p: Project, actor: Activity["actor"], text: string, kind: Activity["kind"]): Project {
  return { ...p, activity: [...p.activity, { id: newId(), actor, text, kind, at: Date.now() }].slice(-200) };
}

/** Status Behrad's verdict pre-selects; "unknown" leaves it for the admin. */
export const statusFromVerdict = (v?: AiVerdict): AcStatus =>
  v === "likely-pass" ? "passed" : v === "likely-fail" ? "failed" : "pending";
