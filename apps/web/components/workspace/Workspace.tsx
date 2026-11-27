"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, FlaskConical, LoaderCircle } from "lucide-react";
import { AGENT_BY_KEY, AGENT_BY_STEP, agentStatus } from "@/lib/agents";
import { api, errorText } from "@/lib/api";
import {
  activeCriteria,
  addActivity,
  confirmedFeatures,
  currentStep,
  fa,
  newId,
  reopenFrom,
  STEP_ORDER,
  stepDone,
  stepIndex,
  stepMeta,
  stepUnlocked,
  hasOutput,
  type AgentKey,
  type ApprovableStep,
  type Criterion,
  type Feature,
  type Journey,
  type Project,
  type Source,
  type StepKey,
} from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import type { ProjectUpdater, SaveState } from "@/lib/store";
import AgentTeamStrip from "../agents/AgentTeamStrip";
import ActivityFeed from "../agents/ActivityFeed";
import { LockedStep, StepFrame, type StepProps } from "../steps/StepFrame";
import SourceStep from "../steps/SourceStep";
import FeaturesStep from "../steps/FeaturesStep";
import JourneysStep from "../steps/JourneysStep";
import CriteriaStep from "../steps/CriteriaStep";
import ApprovalStep from "../steps/ApprovalStep";
import ReportStep from "../steps/ReportStep";

type TaskResult = { apply: (p: Project) => Project; summary: string; demo?: boolean };

const featurePayload = (f: Feature) => ({
  id: f.id,
  title: f.title,
  description: f.description,
  priority: f.priority,
  modules: f.modules ?? [],
});

/** What each agent does when it runs. Every task gets a snapshot of the project and returns a patch. */
const TASKS: Record<AgentKey, (p: Project) => Promise<TaskResult>> = {
  scout: async (p) => {
    const r = await api.analyze({ gitUrl: p.source.gitUrl, markdown: p.source.markdown, markdownName: p.source.markdownName });
    return {
      demo: r.demo,
      summary:
        `تحلیل تمام شد: «${r.analysis.productName}»${r.repo?.fileCount ? ` با ${fa(r.repo.fileCount)} فایل` : ""}، ${fa(r.analysis.techStack.length)} فناوری و ${fa(r.analysis.modules.length)} بخش اصلی.` +
        (r.document && r.document.modules > 1
          ? ` سند ${fa(Math.round(r.document.chars / 1024))} کیلوبایتی را کامل خواندم: ${fa(r.document.modules)} ماژول${r.document.summarized ? ` و برای ${fa(r.document.summarized)} ماژول خلاصه نوشتم` : ""}.`
          : "") +
        " خلاصه را ببین و تأیید کن.",
      apply: (x) => ({
        ...x,
        name: r.analysis.productName || x.name,
        analysis: r.analysis,
        source: { ...x.source, context: r.context, repo: r.repo, analyzedAt: Date.now() },
      }),
    };
  },

  feature: async (p) => {
    const r = await api.features({ analysis: p.analysis, context: p.source.context ?? "" });
    const items: Feature[] = r.features.map((f) => ({
      id: newId(),
      title: f.title,
      description: f.description,
      priority: f.priority,
      modules: f.modules ?? [],
      checked: false,
      origin: "ai",
    }));
    return {
      demo: r.demo,
      summary: `${fa(items.length)} ویژگی در محصول پیدا کردم (${fa(items.filter((f) => f.priority === "required").length)} ضروری). هر کدام را که درست است تیک بزن.`,
      apply: (x) => {
        const old = new Set(x.features.filter((f) => f.origin === "ai").map((f) => f.id));
        return {
          ...x,
          features: [...items, ...x.features.filter((f) => f.origin === "admin")],
          journeys: x.journeys.filter((j) => !old.has(j.featureId)),
          criteria: x.criteria.filter((c) => !old.has(c.featureId)),
        };
      },
    };
  },

  journey: async (p) => {
    const features = confirmedFeatures(p);
    const r = await api.journeys({ analysis: p.analysis, context: p.source.context ?? "", features: features.map(featurePayload) });
    const ids = new Set(features.map((f) => f.id));
    const items: Journey[] = r.journeys
      .filter((j) => ids.has(j.featureId))
      .map((j) => ({ id: newId(), featureId: j.featureId, title: j.title, steps: j.steps, checked: true, origin: "ai" }));
    return {
      demo: r.demo,
      summary: `${fa(items.length)} سفر کاربر برای ${fa(features.length)} ویژگی طراحی کردم. بررسی کن و تأیید کن.`,
      apply: (x) => ({ ...x, journeys: [...items, ...x.journeys.filter((j) => j.origin === "admin")] }),
    };
  },

  criteria: async (p) => {
    const features = confirmedFeatures(p);
    const ids = new Set(features.map((f) => f.id));
    const journeys = p.journeys.filter((j) => j.checked && ids.has(j.featureId));
    const r = await api.criteria({
      analysis: p.analysis,
      context: p.source.context ?? "",
      features: features.map(featurePayload),
      journeys: journeys.map((j) => ({ featureId: j.featureId, title: j.title, steps: j.steps })),
    });
    const items: Criterion[] = r.criteria
      .filter((c) => ids.has(c.featureId))
      .map((c) => ({ id: newId(), featureId: c.featureId, text: c.text, priority: c.priority, origin: "ai", status: "pending" }));
    return {
      demo: r.demo,
      summary: `${fa(items.length)} معیار پذیرش نوشتم (${fa(items.filter((c) => c.priority === "required").length)} ضروری). می‌توانی اضافه یا حذف کنی.`,
      apply: (x) => ({ ...x, criteria: [...items, ...x.criteria.filter((c) => c.origin === "admin")] }),
    };
  },

  qa: async (p) => {
    const features = new Map(confirmedFeatures(p).map((f) => [f.id, f]));
    const criteria = activeCriteria(p);
    const r = await api.review({
      analysis: p.analysis,
      context: p.source.context ?? "",
      markdown: p.source.markdown ?? "",
      criteria: criteria.map((c) => ({
        id: c.id,
        text: c.text,
        feature: features.get(c.featureId)?.title ?? "",
        modules: features.get(c.featureId)?.modules ?? [],
      })),
    });
    const byId = new Map(r.reviews.map((v) => [v.id, v]));
    const pass = r.reviews.filter((v) => v.verdict === "likely-pass").length;
    const fail = r.reviews.filter((v) => v.verdict === "likely-fail").length;
    return {
      demo: r.demo,
      summary: `${fa(r.reviews.length)} معیار را با کد مقایسه کردم: ${fa(pass)} احتمالاً برقرار، ${fa(fail)} احتمالاً ناقص. تصمیم نهایی با توست.`,
      apply: (x) => ({
        ...x,
        criteria: x.criteria.map((c) => {
          const v = byId.get(c.id);
          return v ? { ...c, aiVerdict: v.verdict, aiReason: v.reason } : c;
        }),
      }),
    };
  },

  reporter: async (p) => {
    const m = computeMetrics(p);
    const r = await api.report({
      metrics: {
        productName: p.name,
        readiness: m.readiness,
        completion: m.completion,
        features: m.features,
        journeys: m.journeys,
        required: m.required,
        optional: m.optional,
      },
      features: m.perFeature.map((row) => ({ title: row.feature.title, priority: row.feature.priority, passed: row.passed, failed: row.failed, skipped: row.skipped, total: row.total })),
      criteria: activeCriteria(p)
        .filter((c) => c.status !== "passed")
        .map((c) => ({ text: c.text, priority: c.priority, status: c.status })),
    });
    return {
      demo: r.demo,
      summary: `گزارش نهایی آماده است: آمادگی تحویل ٪${fa(m.readiness)}.`,
      apply: (x) => ({ ...x, report: { summary: r.summary, recommendation: r.recommendation, risks: r.risks, generatedAt: Date.now() } }),
    };
  },
};

const APPROVE_TEXT: Record<ApprovableStep, string> = {
  source: "تحلیل محصول را تأیید کردم.",
  features: "ویژگی‌ها را تأیید کردم.",
  journeys: "سفرهای کاربر را تأیید کردم.",
  criteria: "فهرست معیارهای پذیرش را نهایی کردم.",
  approval: "بررسی معیارهای پذیرش را تأیید کردم.",
};

export default function Workspace({
  project,
  update,
  saveState = "idle",
  onRetrySave,
}: {
  project: Project;
  update: ProjectUpdater;
  saveState?: SaveState;
  onRetrySave?: () => void;
}) {
  const [step, setStep] = useState<StepKey>(() => currentStep(project));
  const [running, setRunning] = useState<AgentKey | null>(null);
  const [liveLine, setLiveLine] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function run(key: AgentKey, snapshot: Project) {
    if (running) return;
    const agent = AGENT_BY_KEY[key];
    setRunning(key);
    let i = 0;
    setLiveLine(agent.working[0]);
    timer.current = setInterval(() => {
      i = (i + 1) % agent.working.length;
      setLiveLine(agent.working[i]);
    }, 1800);
    update((x) => addActivity(x, key, agent.startLine, "info"));

    try {
      const r = await TASKS[key](snapshot);
      update((x) => addActivity({ ...r.apply(x), demo: r.demo ?? x.demo }, key, r.summary, "done"));
    } catch (e) {
      update((x) => addActivity(x, key, `نتوانستم کار را تمام کنم: ${errorText(e)}`, "error"));
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setRunning(null);
      setLiveLine("");
    }
  }

  const analyze = (src: Pick<Source, "gitUrl" | "markdown" | "markdownName">) => {
    const next: Project = { ...project, source: { ...project.source, ...src } };
    update(() => next);
    void run("scout", next);
  };

  const approve = (key: ApprovableStep) => {
    const next = addActivity({ ...project, approved: { ...project.approved, [key]: true } }, "admin", APPROVE_TEXT[key], "admin");
    update(() => next);
    const nextStep = STEP_ORDER[stepIndex(key) + 1];
    setStep(nextStep);
    if (!hasOutput(next, nextStep) || nextStep === "report") void run(AGENT_BY_STEP[nextStep].key, next);
  };

  const reopen = (key: ApprovableStep) => {
    update((p) => addActivity(reopenFrom(p, key), "admin", `مرحله «${stepMeta(key).title}» را برای ویرایش باز کردم.`, "admin"));
    setStep(key);
  };

  const agent = AGENT_BY_STEP[step];
  const props: StepProps = {
    project,
    update,
    status: agentStatus(project, agent, running),
    running: running === agent.key,
    busy: !!running,
    liveLine,
    onRun: () => void run(agent.key, project),
    onApprove: () => step !== "report" && approve(step),
    onReopen: () => step !== "report" && reopen(step),
  };

  const doneCount = STEP_ORDER.filter((s) => stepDone(project, s)).length;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="grid size-9 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="بازگشت">
            <ArrowRight className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">{project.name}</h1>
            <p dir="ltr" className="text-right text-xs text-slate-400">
              {project.source.repo?.fullName ?? project.source.gitUrl ?? ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveBadge state={saveState} onRetry={onRetrySave} />
          {project.demo && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200 ring-1 ring-amber-400/30" title="OPENAI_API_KEY روی سرور تنظیم نشده است">
              <FlaskConical className="size-3.5" />
              حالت نمایشی
            </span>
          )}
          <div className="w-44">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">مراحل انجام‌شده</span>
              <span className="font-bold text-white">
                {fa(doneCount)}/{fa(STEP_ORDER.length)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-l from-violet-400 to-emerald-400 transition-all" style={{ width: `${(doneCount / STEP_ORDER.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <AgentTeamStrip project={project} running={running} liveLine={liveLine} selected={step} onSelect={setStep} />

      <div className="mt-2 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {!stepUnlocked(project, step) ? (
            <StepFrame step={step} status="locked">
              <LockedStep step={step} />
            </StepFrame>
          ) : step === "source" ? (
            <SourceStep {...props} onAnalyze={analyze} />
          ) : step === "features" ? (
            <FeaturesStep {...props} />
          ) : step === "journeys" ? (
            <JourneysStep {...props} />
          ) : step === "criteria" ? (
            <CriteriaStep {...props} />
          ) : step === "approval" ? (
            <ApprovalStep {...props} />
          ) : (
            <ReportStep {...props} />
          )}
        </div>

        <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <div className="h-[460px] xl:h-full">
            <ActivityFeed activity={project.activity} running={running} liveLine={liveLine} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveBadge({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  if (state === "idle") return null;
  if (state === "error") {
    return (
      <button onClick={onRetry} className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-200 ring-1 ring-rose-400/30">
        <CircleAlert className="size-3.5" />
        ذخیره نشد · تلاش دوباره
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      {state === "saving" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-emerald-400" />}
      {state === "saving" ? "در حال ذخیره…" : "ذخیره شد"}
    </span>
  );
}
