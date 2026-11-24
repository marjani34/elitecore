"use client";

import { Bot, Check, UserRound } from "lucide-react";
import type { Origin, Priority } from "@/lib/data";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
  success:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40",
};

export const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/60 focus:bg-white/[0.06] disabled:opacity-50";

export function Checkbox({
  checked,
  onChange,
  disabled,
  color = "#a78bfa",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
      className="grid size-6 shrink-0 place-items-center rounded-lg border transition disabled:cursor-not-allowed"
      style={checked ? { backgroundColor: color, borderColor: color } : { borderColor: "rgba(255,255,255,0.25)" }}
    >
      {checked && <Check className="size-4 text-[#0b1020]" strokeWidth={3} />}
    </button>
  );
}

export function PriorityToggle({
  value,
  onChange,
  disabled,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 rounded-lg bg-white/[0.04] p-0.5 text-[11px]">
      {(["required", "optional"] as Priority[]).map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p)}
          className={`rounded-md px-2 py-1 font-semibold transition disabled:cursor-not-allowed ${
            value === p
              ? p === "required"
                ? "bg-rose-500/20 text-rose-200"
                : "bg-sky-500/20 text-sky-200"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {p === "required" ? "ضروری" : "اختیاری"}
        </button>
      ))}
    </div>
  );
}

export function PriorityChip({ value }: { value: Priority }) {
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
        value === "required" ? "bg-rose-500/15 text-rose-200" : "bg-sky-500/15 text-sky-200"
      }`}
    >
      {value === "required" ? "ضروری" : "اختیاری"}
    </span>
  );
}

export function OriginBadge({ origin, agentName }: { origin: Origin; agentName?: string }) {
  return origin === "ai" ? (
    <span className="flex shrink-0 items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-200" title="پیشنهاد عامل هوشمند">
      <Bot className="size-3" />
      {agentName ?? "AI"}
    </span>
  ) : (
    <span className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200" title="افزوده‌شده توسط ادمین">
      <UserRound className="size-3" />
      ادمین
    </span>
  );
}

export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = "url(#ring-grad)",
  label,
  sub,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
  sub?: string;
}) {
  const r = 50 - stroke / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="font-black text-white" style={{ fontSize: size * 0.2 }}>{label}</span>}
        {sub && <span className="mt-0.5 text-[11px] text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}
