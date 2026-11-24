"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2, X } from "lucide-react";
import { AGENT_BY_STEP } from "@/lib/agents";
import { confirmedFeatures, fa, newId, type Feature, type Journey } from "@/lib/data";
import { btn, Checkbox, inputCls, OriginBadge, PriorityChip } from "../ui";
import { AgentInvite, AgentWorking, ApprovedBar, ApproveFooter, StepFrame, type StepProps } from "./StepFrame";

export default function JourneysStep({ project, update, status, running, busy, liveLine, onRun, onApprove, onReopen }: StepProps) {
  const agent = AGENT_BY_STEP.journeys;
  const approved = project.approved.journeys;
  const features = confirmedFeatures(project);
  const ids = new Set(features.map((f) => f.id));
  const journeys = project.journeys.filter((j) => ids.has(j.featureId));
  const checked = journeys.filter((j) => j.checked).length;

  const patch = (id: string, change: Partial<Journey>) =>
    update((p) => ({ ...p, journeys: p.journeys.map((j) => (j.id === id ? { ...j, ...change } : j)) }));
  const remove = (id: string) => update((p) => ({ ...p, journeys: p.journeys.filter((j) => j.id !== id) }));
  const add = (j: Journey) => update((p) => ({ ...p, journeys: [...p.journeys, j] }));
  const checkAll = () => {
    const value = checked !== journeys.length;
    update((p) => ({ ...p, journeys: p.journeys.map((j) => (ids.has(j.featureId) ? { ...j, checked: value } : j)) }));
  };

  if (running) {
    return (
      <StepFrame step="journeys" status={status}>
        <AgentWorking step="journeys" liveLine={liveLine} />
      </StepFrame>
    );
  }

  if (!journeys.length) {
    return (
      <StepFrame step="journeys" status={status}>
        <AgentInvite step="journeys" busy={busy} onRun={onRun} text={`برای ${fa(features.length)} ویژگی تأییدشده، سفرهای کاربر را قدم‌به‌قدم طراحی می‌کنم.`} />
      </StepFrame>
    );
  }

  return (
    <StepFrame
      step="journeys"
      status={status}
      actions={
        !approved && (
          <button onClick={onRun} disabled={busy} className={btn.ghost}>
            <RefreshCw className="size-4" />
            طراحی دوباره توسط {agent.name}
          </button>
        )
      }
    >
      {approved && <ApprovedBar text={`${fa(checked)} سفر کاربر تأیید شد.`} onReopen={onReopen} />}

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-300">
          {fa(checked)} از {fa(journeys.length)} سفر کاربر تیک خورده
        </p>
        {!approved && (
          <button onClick={checkAll} className="text-xs text-pink-300 hover:text-pink-200">
            {checked === journeys.length ? "برداشتن همه تیک‌ها" : "انتخاب همه"}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {features.map((f) => (
          <FeatureGroup
            key={f.id}
            feature={f}
            journeys={journeys.filter((j) => j.featureId === f.id)}
            approved={approved}
            color={agent.color}
            agentName={agent.name}
            onPatch={patch}
            onRemove={remove}
            onAdd={add}
          />
        ))}
      </div>

      {!approved && (
        <ApproveFooter
          label={`تأیید سفرها و ارسال به ${AGENT_BY_STEP.criteria.name}`}
          hint="سارا بر اساس ویژگی‌ها و سفرهای تیک‌خورده معیارهای پذیرش را می‌نویسد."
          disabled={busy || checked === 0}
          onApprove={onApprove}
        />
      )}
    </StepFrame>
  );
}

function FeatureGroup({
  feature,
  journeys,
  approved,
  color,
  agentName,
  onPatch,
  onRemove,
  onAdd,
}: {
  feature: Feature;
  journeys: Journey[];
  approved: boolean;
  color: string;
  agentName: string;
  onPatch: (id: string, c: Partial<Journey>) => void;
  onRemove: (id: string) => void;
  onAdd: (j: Journey) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const list = steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!title.trim()) return;
    onAdd({ id: newId(), featureId: feature.id, title: title.trim(), steps: list, checked: true, origin: "admin" });
    setTitle("");
    setSteps("");
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold text-white">
          {feature.title}
          <PriorityChip value={feature.priority} />
        </p>
        {!approved && (
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
            {open ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            سفر جدید
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {journeys.map((j) => (
          <div
            key={j.id}
            className={`group rounded-xl border p-3 transition ${j.checked ? "border-pink-400/25 bg-pink-500/[0.05]" : "border-white/5 bg-white/[0.02] opacity-70"}`}
          >
            <div className="flex items-start gap-2.5">
              <Checkbox checked={j.checked} disabled={approved} onChange={() => onPatch(j.id, { checked: !j.checked })} color={color} />
              <p className="flex-1 text-sm font-semibold text-white">{j.title}</p>
              <OriginBadge origin={j.origin} agentName={agentName} />
              {!approved && (
                <button onClick={() => onRemove(j.id)} className="rounded-md p-1 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300" aria-label="حذف">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            {j.steps.length > 0 && (
              <ol className="mt-3 space-y-1.5 pr-1">
                {j.steps.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-6 text-slate-300">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ backgroundColor: `${color}26`, color }}>
                      {fa(i + 1)}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
        {journeys.length === 0 && <p className="text-sm text-slate-500">برای این ویژگی سفری ثبت نشده است.</p>}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-dashed border-white/15 p-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان سفر کاربر" className={inputCls} />
          <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} placeholder={"هر قدم در یک خط\nکاربر وارد می‌شود\n…"} className={`${inputCls} resize-y`} />
          <button type="submit" disabled={!title.trim()} className={btn.ghost}>
            <Plus className="size-4" />
            افزودن سفر
          </button>
        </form>
      )}
    </div>
  );
}
