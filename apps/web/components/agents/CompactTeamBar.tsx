"use client";

import { ADMIN, AGENTS, AGENT_BY_KEY, agentStatus, STATUS_LABEL } from "@/lib/agents";
import { stepMeta, type AgentKey, type Project, type StepKey } from "@/lib/data";
import AgentAvatar from "./AgentAvatar";

/**
 * Slim, always-visible version of the team strip. Pinned to the top of the window
 * once the full strip has scrolled out of view.
 */
export default function CompactTeamBar({
  project,
  running,
  liveLine,
  selected,
  visible,
  onSelect,
}: {
  project: Project;
  running: AgentKey | null;
  liveLine: string;
  selected: StepKey;
  visible: boolean;
  onSelect: (s: StepKey) => void;
}) {
  const worker = running ? AGENT_BY_KEY[running] : null;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-16 z-20 transition-all duration-300 lg:top-0 lg:right-64 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <div className="border-b border-white/10 bg-[#080d1e]/90 px-4 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3">
          <div className="track-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            <span className="flex shrink-0 items-center gap-2 rounded-full py-1 pr-1 pl-3" title={ADMIN.role}>
              <AgentAvatar persona={ADMIN} size={30} human />
              <span className="hidden text-xs font-bold text-amber-200 md:inline">{ADMIN.name}</span>
            </span>

            {AGENTS.map((agent) => {
              const status = agentStatus(project, agent, running);
              const active = selected === agent.step;
              return (
                <div key={agent.key} className="flex shrink-0 items-center">
                  <span className="mx-0.5 h-px w-3 bg-white/15" aria-hidden />
                  <button
                    onClick={() => status !== "locked" && onSelect(agent.step)}
                    disabled={status === "locked"}
                    title={`${agent.name} · ${agent.role} · ${STATUS_LABEL[status]}`}
                    className={`flex items-center gap-2 rounded-full py-1 pr-1 pl-3 transition ${
                      active ? "bg-white/10" : "hover:bg-white/[0.05]"
                    } ${status === "locked" ? "cursor-not-allowed" : ""}`}
                    style={active ? { boxShadow: `inset 0 0 0 1px ${agent.color}88` } : undefined}
                  >
                    <AgentAvatar persona={agent} size={30} status={status} />
                    <span className={`hidden text-xs font-bold sm:inline ${status === "locked" ? "text-slate-500" : "text-white"}`}>
                      {agent.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="hidden min-w-0 max-w-sm shrink items-center gap-2 lg:flex">
            {worker ? (
              <span
                className="flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white"
                style={{ backgroundColor: `${worker.from}cc` }}
              >
                <span className="flex shrink-0 gap-0.5">
                  <span className="typing-dot size-1 rounded-full bg-white" />
                  <span className="typing-dot size-1 rounded-full bg-white" />
                  <span className="typing-dot size-1 rounded-full bg-white" />
                </span>
                <span className="shrink-0 font-bold">{worker.name}:</span>
                <span className="truncate">{liveLine}</span>
              </span>
            ) : (
              <span className="truncate text-xs text-slate-400">
                مرحله: <span className="font-semibold text-slate-200">{stepMeta(selected).title}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
