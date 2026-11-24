"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { AGENT_BY_STEP } from "@/lib/agents";
import { activeCriteria, confirmedFeatures, fa, newId, type Criterion, type Feature, type Priority } from "@/lib/data";
import { btn, inputCls, OriginBadge, PriorityChip, PriorityToggle } from "../ui";
import { AgentInvite, AgentWorking, ApprovedBar, ApproveFooter, StepFrame, type StepProps } from "./StepFrame";

export default function CriteriaStep({ project, update, status, running, busy, liveLine, onRun, onApprove, onReopen }: StepProps) {
  const agent = AGENT_BY_STEP.criteria;
  const approved = project.approved.criteria;
  const features = confirmedFeatures(project);
  const criteria = activeCriteria(project);
  const required = criteria.filter((c) => c.priority === "required").length;

  const patch = (id: string, change: Partial<Criterion>) =>
    update((p) => ({ ...p, criteria: p.criteria.map((c) => (c.id === id ? { ...c, ...change } : c)) }));
  const remove = (id: string) => update((p) => ({ ...p, criteria: p.criteria.filter((c) => c.id !== id) }));
  const add = (c: Criterion) => update((p) => ({ ...p, criteria: [...p.criteria, c] }));

  if (running) {
    return (
      <StepFrame step="criteria" status={status}>
        <AgentWorking step="criteria" liveLine={liveLine} />
      </StepFrame>
    );
  }

  if (!criteria.length) {
    return (
      <StepFrame step="criteria" status={status}>
        <AgentInvite step="criteria" busy={busy} onRun={onRun} text="بر اساس ویژگی‌ها و سفرهای کاربر تأییدشده، معیارهای پذیرش قابل‌آزمون می‌نویسم." />
      </StepFrame>
    );
  }

  return (
    <StepFrame
      step="criteria"
      status={status}
      actions={
        !approved && (
          <button onClick={onRun} disabled={busy} className={btn.ghost}>
            <RefreshCw className="size-4" />
            نوشتن دوباره توسط {agent.name}
          </button>
        )
      }
    >
      {approved && <ApprovedBar text={`فهرست ${fa(criteria.length)} معیار پذیرش نهایی شد.`} onReopen={onReopen} />}

      <p className="mb-4 text-sm text-slate-300">
        {fa(criteria.length)} معیار پذیرش · {fa(required)} ضروری · {fa(criteria.length - required)} اختیاری
      </p>

      <div className="space-y-5">
        {features.map((f) => (
          <Group
            key={f.id}
            feature={f}
            items={criteria.filter((c) => c.featureId === f.id)}
            approved={approved}
            agentName={agent.name}
            onPatch={patch}
            onRemove={remove}
            onAdd={add}
          />
        ))}
      </div>

      {!approved && (
        <ApproveFooter
          label={`نهایی کردن فهرست و ارسال به ${AGENT_BY_STEP.approval.name}`}
          hint="در مرحله بعد بهراد هر معیار را با کد مقایسه می‌کند و تو یک‌به‌یک تأییدشان می‌کنی."
          disabled={busy || criteria.length === 0}
          onApprove={onApprove}
        />
      )}
    </StepFrame>
  );
}

function Group({
  feature,
  items,
  approved,
  agentName,
  onPatch,
  onRemove,
  onAdd,
}: {
  feature: Feature;
  items: Criterion[];
  approved: boolean;
  agentName: string;
  onPatch: (id: string, c: Partial<Criterion>) => void;
  onRemove: (id: string) => void;
  onAdd: (c: Criterion) => void;
}) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>(feature.priority);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd({ id: newId(), featureId: feature.id, text: text.trim(), priority, origin: "admin", status: "pending" });
    setText("");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-2 font-bold text-white">
        {feature.title}
        <PriorityChip value={feature.priority} />
      </p>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-500/[0.04] px-3 py-2.5 sm:flex-nowrap">
            <p className="min-w-0 flex-1 text-[13px] leading-7 text-slate-200">{c.text}</p>
            <div className="flex shrink-0 items-center gap-2">
              <OriginBadge origin={c.origin} agentName={agentName} />
              <PriorityToggle value={c.priority} disabled={approved} onChange={(v) => onPatch(c.id, { priority: v })} />
              {!approved && (
                <button onClick={() => onRemove(c.id)} className="rounded-md p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300" aria-label="حذف">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">معیاری برای این ویژگی ثبت نشده است.</p>}
      </ul>

      {!approved && (
        <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="با فرض اینکه … وقتی … آنگاه …" className={inputCls} />
          <div className="flex items-center">
            <PriorityToggle value={priority} onChange={setPriority} />
          </div>
          <button type="submit" disabled={!text.trim()} className={btn.ghost}>
            <Plus className="size-4" />
            افزودن
          </button>
        </form>
      )}
    </div>
  );
}
