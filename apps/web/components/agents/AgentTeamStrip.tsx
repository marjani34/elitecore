"use client";

import { ADMIN, AGENTS, agentStatus, STATUS_LABEL, type AgentStatus } from "@/lib/agents";
import { fa, type AgentKey, type Project, type StepKey } from "@/lib/data";
import AgentAvatar from "./AgentAvatar";

const PILL: Record<AgentStatus, string> = {
  working: "bg-cyan-400/15 text-cyan-200 ring-cyan-400/40",
  waiting: "bg-amber-400/15 text-amber-200 ring-amber-400/40",
  done: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/40",
  ready: "bg-violet-400/15 text-violet-200 ring-violet-400/40",
  locked: "bg-white/5 text-slate-500 ring-white/10",
};

/** The agent team as a hand-off pipeline: admin → Kaveh → … → Mahsa. */
export default function AgentTeamStrip({
  project,
  running,
  liveLine,
  selected,
  onSelect,
}: {
  project: Project;
  running: AgentKey | null;
  liveLine: string;
  selected: StepKey;
  onSelect: (s: StepKey) => void;
}) {
  return (
    <div className="track-scroll -mx-4 overflow-x-auto px-4 pt-16 pb-4">
      <ol className="flex min-w-max items-stretch">
        <li className="flex items-center">
          <div className="flex w-36 flex-col items-center rounded-3xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-4 text-center">
            <AgentAvatar persona={ADMIN} size={54} human />
            <p className="mt-3 text-sm font-extrabold text-white">{ADMIN.name}</p>
            <p className="mt-0.5 text-[11px] leading-5 text-amber-200/80">{ADMIN.role}</p>
          </div>
          <Connector active={!!running} color={ADMIN.color} />
        </li>

        {AGENTS.map((agent, i) => {
          const status = agentStatus(project, agent, running);
          const isSelected = selected === agent.step;
          const bubble =
            status === "working" ? liveLine : status === "waiting" ? "کارم آماده است؛ بررسی و تأیید کن." : "";
          return (
            <li key={agent.key} className="flex items-center">
              <button
                onClick={() => status !== "locked" && onSelect(agent.step)}
                disabled={status === "locked"}
                className={`relative flex w-40 flex-col items-center rounded-3xl border px-3 py-4 text-center transition ${
                  isSelected ? "bg-white/[0.07]" : "bg-[#0d1328]/70 hover:bg-white/[0.04]"
                } ${status === "locked" ? "cursor-not-allowed" : ""}`}
                style={{
                  borderColor: isSelected ? `${agent.color}99` : "rgba(255,255,255,0.08)",
                  boxShadow: isSelected || status === "working" ? `0 20px 50px -25px ${agent.color}` : undefined,
                }}
              >
                {bubble && (
                  <span
                    className="absolute -top-14 left-1/2 w-48 -translate-x-1/2 rounded-2xl px-3 py-2 text-[11px] leading-5 text-white shadow-xl animate-rise"
                    style={{ backgroundColor: `${agent.from}`, boxShadow: `0 10px 30px -10px ${agent.color}` }}
                  >
                    {bubble}
                    <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45" style={{ backgroundColor: agent.from }} />
                  </span>
                )}
                <span className="absolute top-2.5 right-3 text-[10px] font-bold text-slate-500">{fa(i + 1)}</span>
                <AgentAvatar persona={agent} size={54} status={status} />
                <p className="mt-3 text-sm font-extrabold text-white">{agent.name}</p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{agent.role}</p>
                <span className={`mt-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${PILL[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
              </button>
              {i < AGENTS.length - 1 && <Connector active={status === "done"} color={agent.color} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Connector({ active, color }: { active: boolean; color: string }) {
  return (
    <svg width="40" height="12" viewBox="0 0 40 12" className="shrink-0" aria-hidden>
      <line
        x1="38"
        y1="6"
        x2="2"
        y2="6"
        stroke={active ? color : "rgba(255,255,255,0.15)"}
        strokeWidth="2"
        strokeDasharray="4 5"
        className={active ? "animate-dash" : ""}
      />
      <circle cx="2" cy="6" r="2.5" fill={active ? color : "rgba(255,255,255,0.2)"} />
    </svg>
  );
}
