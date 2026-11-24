"use client";

import { AlertTriangle, CircleCheck, CircleX, Printer, RefreshCw } from "lucide-react";
import { AGENTS, AGENT_BY_STEP } from "@/lib/agents";
import { fa, pct } from "@/lib/data";
import { computeMetrics, type Tally } from "@/lib/metrics";
import AgentAvatar from "../agents/AgentAvatar";
import { btn, PriorityChip, Ring } from "../ui";
import { AgentInvite, AgentWorking, StepFrame, type StepProps } from "./StepFrame";

export default function ReportStep({ project, status, running, busy, liveLine, onRun }: StepProps) {
  const agent = AGENT_BY_STEP.report;
  const m = computeMetrics(project);
  const report = project.report;

  if (running) {
    return (
      <StepFrame step="report" status={status}>
        <AgentWorking step="report" liveLine={liveLine} />
      </StepFrame>
    );
  }

  if (!report) {
    return (
      <StepFrame step="report" status={status}>
        <AgentInvite step="report" busy={busy} onRun={onRun} text="همه نتایج تیم را جمع‌بندی می‌کنم و گزارش آمادگی تحویل را می‌نویسم." />
      </StepFrame>
    );
  }

  const blockers = m.required.failed + m.required.skipped;
  const contributions: Record<string, string> = {
    scout: `${fa(project.analysis?.modules.length ?? 0)} ماژول شناسایی کرد`,
    feature: `${fa(m.features.byAi)} ویژگی پیشنهاد داد`,
    journey: `${fa(project.journeys.filter((j) => j.origin === "ai").length)} سفر کاربر طراحی کرد`,
    criteria: `${fa(project.criteria.filter((c) => c.origin === "ai").length)} معیار پذیرش نوشت`,
    qa: `${fa(project.criteria.filter((c) => c.aiVerdict).length)} معیار را بازبینی کرد`,
    reporter: "این گزارش را نوشت",
  };

  return (
    <StepFrame
      step="report"
      status={status}
      actions={
        <>
          <button onClick={() => window.print()} className={btn.ghost}>
            <Printer className="size-4" />
            چاپ / PDF
          </button>
          <button onClick={onRun} disabled={busy} className={btn.ghost}>
            <RefreshCw className="size-4" />
            گزارش دوباره
          </button>
        </>
      }
    >
      {/* Verdict */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 ${
          m.ready ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-transparent" : "border-rose-400/30 bg-gradient-to-br from-rose-500/15 to-transparent"
        }`}
      >
        <div className="flex flex-wrap items-center gap-8">
          <Ring value={m.readiness} size={150} label={`٪${fa(m.readiness)}`} sub="آمادگی تحویل" color={m.ready ? "#34d399" : "url(#ring-grad)"} />
          <div className="min-w-0 flex-1">
            <p className={`flex items-center gap-2 text-sm font-bold ${m.ready ? "text-emerald-200" : "text-rose-200"}`}>
              {m.ready ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />}
              {m.ready ? "آماده تحویل به کارفرما" : "هنوز آماده تحویل نیست"}
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">{project.name}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {fa(m.required.passed)} از {fa(m.required.total)} معیار ضروری پذیرفته شد
              {blockers > 0 && ` · ${fa(blockers)} معیار ضروری مانع تحویل است`}.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              پیشرفت کل (بدون موارد اختیاری صرف‌نظرشده): ٪{fa(m.completion)}
            </p>
          </div>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Big label="ویژگی‌های تأییدشده" value={`${fa(m.features.confirmed)}/${fa(m.features.listed)}`} sub={`${fa(m.features.required)} ضروری · ${fa(m.features.optional)} اختیاری`} />
        <Big label="سفرهای کاربر" value={fa(m.journeys.confirmed)} sub={`از ${fa(m.journeys.listed)} پیشنهاد`} />
        <Big label="معیارهای پذیرش" value={fa(m.all.total)} sub={`${fa(m.required.total)} ضروری · ${fa(m.optional.total)} اختیاری`} />
        <Big label="انجام‌شده (پذیرفته)" value={`٪${fa(pct(m.all.passed, m.all.total))}`} sub={`${fa(m.all.passed)} از ${fa(m.all.total)} معیار`} />
      </div>

      {/* Required vs optional */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Split
          title="ضروری برای تحویل"
          hint="این موارد باید همه پذیرفته شوند."
          t={m.required}
          tone="rose"
        />
        <Split
          title="اختیاری (قابل صرف‌نظر)"
          hint={`٪${fa(m.optionalSkippedPct)} از موارد اختیاری صرف‌نظر شد؛ این موارد مانع تحویل نیستند.`}
          t={m.optional}
          tone="sky"
        />
      </div>

      {/* AI summary */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-3">
          <AgentAvatar persona={agent} size={40} status="done" />
          <div>
            <p className="font-bold text-white">جمع‌بندی {agent.name}</p>
            <p className="text-xs text-slate-500">{new Date(report.generatedAt).toLocaleString("fa-IR")}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-8 text-slate-200">{report.summary}</p>
        <p className="mt-4 rounded-xl bg-blue-500/10 px-4 py-3 text-sm font-semibold leading-7 text-blue-100">{report.recommendation}</p>
        {report.risks.length > 0 && (
          <ul className="mt-4 space-y-2">
            {report.risks.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-amber-100/90">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Per feature */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-white/[0.04] text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 text-right font-medium">ویژگی</th>
              <th className="px-4 py-3 text-right font-medium">اولویت</th>
              <th className="px-4 py-3 text-center font-medium">سفر کاربر</th>
              <th className="px-4 py-3 text-center font-medium">پذیرفته</th>
              <th className="px-4 py-3 text-center font-medium">رد</th>
              <th className="px-4 py-3 text-center font-medium">صرف‌نظر</th>
              <th className="px-4 py-3 text-right font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {m.perFeature.map((row) => (
              <tr key={row.feature.id} className="border-t border-white/5">
                <td className="px-4 py-3 font-semibold text-white">{row.feature.title}</td>
                <td className="px-4 py-3"><PriorityChip value={row.feature.priority} /></td>
                <td className="px-4 py-3 text-center text-slate-300">{fa(row.journeys)}</td>
                <td className="px-4 py-3 text-center text-emerald-300">{fa(row.passed)}/{fa(row.total)}</td>
                <td className="px-4 py-3 text-center text-rose-300">{fa(row.failed)}</td>
                <td className="px-4 py-3 text-center text-slate-400">{fa(row.skipped)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${row.done ? "bg-emerald-500/15 text-emerald-200" : "bg-amber-500/15 text-amber-200"}`}>
                    {row.done ? "کامل" : "ناقص"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Team credits */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="font-bold text-white">تیمی که این گزارش را ساخت</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <div key={a.key} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
              <AgentAvatar persona={a} size={40} status="done" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  {a.name} <span className="text-xs font-normal text-slate-500">· {a.role}</span>
                </p>
                <p className="text-xs text-slate-400">{contributions[a.key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StepFrame>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function Split({ title, hint, t, tone }: { title: string; hint: string; t: Tally; tone: "rose" | "sky" }) {
  const seg = [
    { label: "پذیرفته", value: t.passed, color: "#34d399" },
    { label: "رد", value: t.failed, color: "#fb7185" },
    { label: "صرف‌نظر", value: t.skipped, color: "#64748b" },
    { label: "در انتظار", value: t.pending, color: "#fbbf24" },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className={`font-bold ${tone === "rose" ? "text-rose-100" : "text-sky-100"}`}>{title}</p>
        <p className="text-2xl font-black text-white">٪{fa(pct(t.passed, t.total))}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10">
        {seg.map((s) => (
          <div key={s.label} style={{ width: `${pct(s.value, t.total)}%`, backgroundColor: s.color }} title={s.label} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {seg.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}: {fa(s.value)} (٪{fa(pct(s.value, t.total))})
          </span>
        ))}
      </div>
    </div>
  );
}
