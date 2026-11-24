"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { AGENT_BY_STEP } from "@/lib/agents";
import { fa, newId, type Feature, type Priority } from "@/lib/data";
import { btn, Checkbox, inputCls, OriginBadge, PriorityToggle } from "../ui";
import { AgentInvite, AgentWorking, ApprovedBar, ApproveFooter, StepFrame, type StepProps } from "./StepFrame";

export default function FeaturesStep({ project, update, status, running, busy, liveLine, onRun, onApprove, onReopen }: StepProps) {
  const agent = AGENT_BY_STEP.features;
  const approved = project.approved.features;
  const features = project.features;
  const checked = features.filter((f) => f.checked).length;
  const required = features.filter((f) => f.checked && f.priority === "required").length;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("required");

  const patch = (id: string, change: Partial<Feature>) =>
    update((p) => ({ ...p, features: p.features.map((f) => (f.id === id ? { ...f, ...change } : f)) }));

  const remove = (id: string) =>
    update((p) => ({
      ...p,
      features: p.features.filter((f) => f.id !== id),
      journeys: p.journeys.filter((j) => j.featureId !== id),
      criteria: p.criteria.filter((c) => c.featureId !== id),
    }));

  const toggleAll = () => {
    const value = checked !== features.length;
    update((p) => ({ ...p, features: p.features.map((f) => ({ ...f, checked: value })) }));
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((p) => ({
      ...p,
      features: [...p.features, { id: newId(), title: title.trim(), description: description.trim(), priority, checked: true, origin: "admin" }],
    }));
    setTitle("");
    setDescription("");
  };

  if (running) {
    return (
      <StepFrame step="features" status={status}>
        <AgentWorking step="features" liveLine={liveLine} />
      </StepFrame>
    );
  }

  if (!features.length) {
    return (
      <StepFrame step="features" status={status}>
        <AgentInvite step="features" busy={busy} onRun={onRun} text="من ویژگی‌هایی را که محصول همین حالا دارد پیدا می‌کنم و ضروری یا اختیاری بودنشان را مشخص می‌کنم." />
      </StepFrame>
    );
  }

  return (
    <StepFrame
      step="features"
      status={status}
      actions={
        !approved && (
          <button onClick={onRun} disabled={busy} className={btn.ghost}>
            <RefreshCw className="size-4" />
            فهرست دوباره توسط {agent.name}
          </button>
        )
      }
    >
      {approved && <ApprovedBar text={`${fa(checked)} ویژگی تأیید شد.`} onReopen={onReopen} />}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">
          {fa(checked)} از {fa(features.length)} ویژگی تیک خورده · {fa(required)} ضروری
        </p>
        {!approved && (
          <button onClick={toggleAll} className="text-xs text-violet-300 hover:text-violet-200">
            {checked === features.length ? "برداشتن همه تیک‌ها" : "انتخاب همه"}
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {features.map((f) => (
          <li
            key={f.id}
            className={`group flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
              f.checked ? "border-violet-400/25 bg-violet-500/[0.06]" : "border-white/5 bg-white/[0.02]"
            }`}
          >
            <div className="pt-0.5">
              <Checkbox checked={f.checked} disabled={approved} onChange={() => patch(f.id, { checked: !f.checked })} color={agent.color} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${f.checked ? "text-white" : "text-slate-400"}`}>{f.title}</p>
              {f.description && <p className="mt-0.5 text-sm leading-6 text-slate-400">{f.description}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <OriginBadge origin={f.origin} agentName={agent.name} />
              <PriorityToggle value={f.priority} disabled={approved} onChange={(v) => patch(f.id, { priority: v })} />
              {!approved && (
                <button onClick={() => remove(f.id)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300" aria-label="حذف">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!approved && (
        <form onSubmit={add} className="mt-4 grid gap-2 rounded-2xl border border-dashed border-white/15 p-3 sm:grid-cols-[1fr_1.4fr_auto_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ویژگی جدید" className={inputCls} />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح کوتاه (اختیاری)" className={inputCls} />
          <div className="flex items-center">
            <PriorityToggle value={priority} onChange={setPriority} />
          </div>
          <button type="submit" disabled={!title.trim()} className={btn.ghost}>
            <Plus className="size-4" />
            افزودن
          </button>
        </form>
      )}

      {!approved && (
        <ApproveFooter
          label={`تأیید ویژگی‌ها و ارسال به ${AGENT_BY_STEP.journeys.name}`}
          hint="فقط ویژگی‌های تیک‌خورده به مرحله بعد می‌روند."
          disabled={busy || checked === 0}
          onApprove={onApprove}
        />
      )}
    </StepFrame>
  );
}
