"use client";

import { CircleCheck, Lock, Pencil, Play } from "lucide-react";
import { AGENT_BY_STEP, STATUS_LABEL, type AgentStatus } from "@/lib/agents";
import { fa, stepIndex, stepMeta, type Project, type StepKey } from "@/lib/data";
import type { ProjectUpdater } from "@/lib/store";
import AgentAvatar from "../agents/AgentAvatar";
import { btn } from "../ui";

export interface StepProps {
  project: Project;
  update: ProjectUpdater;
  status: AgentStatus;
  running: boolean;
  busy: boolean;
  liveLine: string;
  onRun: () => void;
  onApprove: () => void;
  onReopen: () => void;
}

export function StepFrame({
  step,
  status,
  actions,
  children,
}: {
  step: StepKey;
  status: AgentStatus;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const agent = AGENT_BY_STEP[step];
  const meta = stepMeta(step);
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1328]/80 backdrop-blur">
      <header
        className="relative flex flex-wrap items-center gap-4 border-b border-white/5 p-5 sm:p-6"
        style={{ background: `linear-gradient(to left, ${agent.color}14, transparent 60%)` }}
      >
        <AgentAvatar persona={agent} size={60} status={status} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold" style={{ color: agent.color }}>
            مرحله {fa(stepIndex(step) + 1)} · {agent.name}، {agent.role}
            <span className="mr-2 text-slate-500">({STATUS_LABEL[status]})</span>
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">{meta.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{meta.short}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function AgentWorking({ step, liveLine }: { step: StepKey; liveLine: string }) {
  const agent = AGENT_BY_STEP[step];
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <AgentAvatar persona={agent} size={96} status="working" />
      <p className="mt-6 text-lg font-extrabold text-white">{agent.name} مشغول کار است</p>
      <p className="mt-2 min-h-6 text-sm text-slate-300 animate-rise" key={liveLine}>
        {liveLine}
      </p>
      <div className="mt-8 w-full max-w-lg space-y-2">
        {[90, 75, 82].map((w, i) => (
          <div key={i} className="shimmer h-10 rounded-xl" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function AgentInvite({ step, onRun, busy, text }: { step: StepKey; onRun: () => void; busy: boolean; text: string }) {
  const agent = AGENT_BY_STEP[step];
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <AgentAvatar persona={agent} size={84} status="ready" />
      <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">{text}</p>
      <button onClick={onRun} disabled={busy} className={`${btn.primary} mt-6`}>
        <Play className="size-4" />
        شروع کار {agent.name}
      </button>
    </div>
  );
}

export function LockedStep({ step }: { step: StepKey }) {
  const agent = AGENT_BY_STEP[step];
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <AgentAvatar persona={agent} size={84} status="locked" />
      <p className="mt-6 flex items-center gap-2 font-bold text-slate-300">
        <Lock className="size-4" />
        {agent.name} منتظر تأیید مرحله قبل است
      </p>
      <p className="mt-2 text-sm text-slate-500">مرحله‌های قبلی را تأیید کن تا کار به {agent.name} برسد.</p>
    </div>
  );
}

export function ApprovedBar({ text, onReopen }: { text: string; onReopen: () => void }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.07] px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
        <CircleCheck className="size-5" />
        {text}
      </p>
      <button onClick={onReopen} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white">
        <Pencil className="size-3.5" />
        ویرایش دوباره
      </button>
    </div>
  );
}

export function ApproveFooter({
  label,
  hint,
  disabled,
  onApprove,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
      <p className="text-xs text-slate-400">{hint}</p>
      <button onClick={onApprove} disabled={disabled} className={btn.success}>
        <CircleCheck className="size-4" />
        {label}
      </button>
    </div>
  );
}
