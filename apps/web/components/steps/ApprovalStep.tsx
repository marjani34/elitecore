"use client";

import { useState } from "react";
import { Ban, Check, CircleHelp, RefreshCw, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { AGENT_BY_STEP } from "@/lib/agents";
import { activeCriteria, confirmedFeatures, fa, statusFromVerdict, type AcStatus, type AiVerdict, type Criterion } from "@/lib/data";
import { tally } from "@/lib/metrics";
import { btn, PriorityChip } from "../ui";
import { AgentWorking, ApprovedBar, ApproveFooter, StepFrame, type StepProps } from "./StepFrame";

const VERDICT: Record<AiVerdict, { label: string; cls: string; icon: React.ReactNode }> = {
  "likely-pass": { label: "احتمالاً برقرار است", cls: "bg-emerald-500/10 text-emerald-200", icon: <ThumbsUp className="size-3" /> },
  "likely-fail": { label: "احتمالاً برقرار نیست", cls: "bg-rose-500/10 text-rose-200", icon: <ThumbsDown className="size-3" /> },
  unknown: { label: "نیاز به بررسی دستی", cls: "bg-slate-500/15 text-slate-300", icon: <CircleHelp className="size-3" /> },
};

const STATUS_BTN: { value: Exclude<AcStatus, "pending">; label: string; icon: React.ReactNode; on: string }[] = [
  { value: "passed", label: "پذیرفته", icon: <Check className="size-3.5" />, on: "bg-emerald-500 text-[#0b1020]" },
  { value: "failed", label: "رد", icon: <X className="size-3.5" />, on: "bg-rose-500 text-white" },
  { value: "skipped", label: "صرف‌نظر", icon: <Ban className="size-3.5" />, on: "bg-slate-500 text-white" },
];

type Filter = "all" | AcStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "pending", label: "در انتظار" },
  { value: "passed", label: "پذیرفته" },
  { value: "failed", label: "رد" },
  { value: "skipped", label: "صرف‌نظر" },
];

export default function ApprovalStep({ project, update, status, running, busy, liveLine, onRun, onApprove, onReopen }: StepProps) {
  const agent = AGENT_BY_STEP.approval;
  const approved = project.approved.approval;
  const features = confirmedFeatures(project);
  const criteria = activeCriteria(project);
  const t = tally(criteria);
  const reviewed = criteria.some((c) => c.aiVerdict);
  const suggestedPending = criteria.filter((c) => c.status === "pending" && c.aiVerdict && c.aiVerdict !== "unknown").length;
  const byBehrad = criteria.filter((c) => c.decidedBy === "ai" && c.status !== "pending").length;
  const needsYou = criteria.filter((c) => c.status === "pending").length;
  const [filter, setFilter] = useState<Filter>("all");

  const setStatus = (id: string, s: AcStatus) =>
    update((p) => ({
      ...p,
      criteria: p.criteria.map((c) =>
        c.id === id ? { ...c, status: c.status === s ? "pending" : s, decidedBy: "admin" } : c,
      ),
    }));

  /** For criteria reviewed before pre-selection existed: apply Behrad's suggestions to undecided ones. */
  const acceptSuggestions = () =>
    update((p) => ({
      ...p,
      criteria: p.criteria.map((c) =>
        c.status === "pending" && c.aiVerdict && c.aiVerdict !== "unknown"
          ? { ...c, status: statusFromVerdict(c.aiVerdict), decidedBy: "ai" }
          : c,
      ),
    }));

  if (running) {
    return (
      <StepFrame step="approval" status={status}>
        <AgentWorking step="approval" liveLine={liveLine} />
      </StepFrame>
    );
  }

  const visible = (list: Criterion[]) => (filter === "all" ? list : list.filter((c) => c.status === filter));

  return (
    <StepFrame
      step="approval"
      status={status}
      actions={
        !approved && (
          <button onClick={onRun} disabled={busy} className={btn.ghost}>
            <RefreshCw className="size-4" />
            {reviewed ? `بررسی دوباره توسط ${agent.name}` : `بررسی توسط ${agent.name}`}
          </button>
        )
      }
    >
      {approved && <ApprovedBar text="همه معیارهای پذیرش بررسی و تأیید شد." onReopen={onReopen} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count label="پذیرفته" value={t.passed} total={t.total} color="#34d399" />
        <Count label="رد" value={t.failed} total={t.total} color="#fb7185" />
        <Count label="صرف‌نظر" value={t.skipped} total={t.total} color="#94a3b8" />
        <Count label="در انتظار" value={t.pending} total={t.total} color="#fbbf24" />
      </div>

      {!approved && reviewed && (byBehrad > 0 || needsYou > 0) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3">
          <p className="flex items-center gap-2 text-sm leading-7 text-emerald-100">
            <Sparkles className="size-4 shrink-0" />
            {byBehrad > 0 && <>{agent.name} {fa(byBehrad)} معیار را از پیش علامت زده است؛ هر کدام را قبول نداری تغییر بده. </>}
            {needsYou > 0 && <>{fa(needsYou)} معیار منتظر تصمیم توست.</>}
          </p>
          {suggestedPending > 0 && (
            <button onClick={acceptSuggestions} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/30">
              اعمال پیشنهادهای {agent.name}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs transition ${filter === f.value ? "bg-white/15 text-white" : "bg-white/[0.04] text-slate-400 hover:text-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {features.map((f) => {
          const items = visible(criteria.filter((c) => c.featureId === f.id));
          if (!items.length) return null;
          return (
            <div key={f.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-3 flex items-center gap-2 font-bold text-white">
                {f.title}
                <PriorityChip value={f.priority} />
              </p>
              <ul className="space-y-2">
                {items.map((c) => (
                  <li
                    key={c.id}
                    className={`rounded-xl border px-3 py-3 transition ${
                      c.status === "passed"
                        ? "border-emerald-400/25 bg-emerald-500/[0.05]"
                        : c.status === "failed"
                          ? "border-rose-400/25 bg-rose-500/[0.05]"
                          : c.status === "skipped"
                            ? "border-white/5 bg-white/[0.02] opacity-70"
                            : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start gap-3 lg:flex-nowrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-7 text-slate-200">{c.text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <PriorityChip value={c.priority} />
                          {c.decidedBy === "ai" && c.status !== "pending" && (
                            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-300">انتخاب {agent.name}</span>
                          )}
                          {c.aiVerdict && (
                            <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${VERDICT[c.aiVerdict].cls}`}>
                              {VERDICT[c.aiVerdict].icon}
                              {agent.name}: {VERDICT[c.aiVerdict].label}
                            </span>
                          )}
                        </div>
                        {c.aiReason && <p className="mt-1.5 text-xs leading-6 text-slate-500">{c.aiReason}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1 rounded-xl bg-white/[0.04] p-1">
                        {STATUS_BTN.map((b) => (
                          <button
                            key={b.value}
                            disabled={approved}
                            onClick={() => setStatus(c.id, b.value)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed ${
                              c.status === b.value ? b.on : "text-slate-400 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {b.icon}
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!approved && (
        <ApproveFooter
          label={`تأیید نهایی و ارسال به ${AGENT_BY_STEP.report.name}`}
          hint={t.pending ? `${fa(t.pending)} معیار هنوز بررسی نشده است.` : "همه معیارها بررسی شده‌اند؛ مهسا گزارش نهایی را می‌نویسد."}
          disabled={busy || t.pending > 0 || t.total === 0}
          onApprove={onApprove}
        />
      )}
    </StepFrame>
  );
}

function Count({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{fa(value)}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
