"use client";

import { useEffect, useRef } from "react";
import { ADMIN, AGENT_BY_KEY } from "@/lib/agents";
import { timeFa, type Activity, type AgentKey } from "@/lib/data";
import AgentAvatar from "./AgentAvatar";

/** The team's chat log: what each agent did, and what the admin approved. */
export default function ActivityFeed({
  activity,
  running,
  liveLine,
}: {
  activity: Activity[];
  running: AgentKey | null;
  liveLine: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [activity.length, liveLine]);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1124]/90 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <p className="font-bold text-white">گفتگوی تیم</p>
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`size-1.5 rounded-full ${running ? "animate-pulse bg-cyan-400" : "bg-emerald-400"}`} />
          {running ? "یک عامل در حال کار است" : "همه آماده‌اند"}
        </span>
      </div>

      <div ref={ref} className="flex-1 space-y-4 overflow-y-auto p-4">
        {activity.length === 0 && !running && (
          <p className="py-10 text-center text-sm leading-7 text-slate-500">
            هنوز خبری نیست.
            <br />
            با افزودن منبع محصول، کاوه کارش را شروع می‌کند.
          </p>
        )}

        {activity.map((a) => {
          const persona = a.actor === "admin" ? ADMIN : AGENT_BY_KEY[a.actor];
          return (
            <div key={a.id} className="flex items-start gap-3 animate-rise">
              <AgentAvatar persona={persona} size={32} human={a.actor === "admin"} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-xs">
                  <span className="font-bold" style={{ color: persona.color }}>
                    {persona.name}
                  </span>
                  <span className="text-slate-500">{timeFa(a.at)}</span>
                </p>
                <p
                  className={`mt-1 rounded-2xl rounded-tr-md px-3 py-2 text-[13px] leading-6 ${
                    a.kind === "error"
                      ? "bg-rose-500/10 text-rose-200"
                      : a.kind === "admin"
                        ? "bg-amber-400/10 text-amber-100"
                        : a.kind === "done"
                          ? "bg-white/[0.06] text-slate-100"
                          : "bg-white/[0.03] text-slate-300"
                  }`}
                >
                  {a.text}
                </p>
              </div>
            </div>
          );
        })}

        {running && (
          <div className="flex items-start gap-3 animate-rise">
            <AgentAvatar persona={AGENT_BY_KEY[running]} size={32} status="working" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold" style={{ color: AGENT_BY_KEY[running].color }}>
                {AGENT_BY_KEY[running].name}
              </p>
              <div className="mt-1 flex items-center gap-2 rounded-2xl rounded-tr-md bg-white/[0.04] px-3 py-2 text-[13px] text-slate-300">
                <span className="flex gap-1">
                  <span className="typing-dot size-1.5 rounded-full bg-slate-300" />
                  <span className="typing-dot size-1.5 rounded-full bg-slate-300" />
                  <span className="typing-dot size-1.5 rounded-full bg-slate-300" />
                </span>
                {liveLine}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
