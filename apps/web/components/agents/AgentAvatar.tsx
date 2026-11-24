import type { AgentStatus, Persona } from "@/lib/agents";

const DOT: Record<AgentStatus, string> = {
  working: "#22d3ee",
  waiting: "#f59e0b",
  done: "#34d399",
  ready: "#a78bfa",
  locked: "#475569",
};

/**
 * Person-style avatar for an agent (or the admin). AI agents get a glowing visor;
 * the badge shows their role icon, the dot their status.
 */
export default function AgentAvatar({
  persona,
  size = 56,
  status,
  human = false,
}: {
  persona: Persona;
  size?: number;
  status?: AgentStatus;
  human?: boolean;
}) {
  const Icon = persona.icon;
  const badge = Math.max(16, Math.round(size * 0.36));
  const dim = status === "locked";

  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {status === "working" && (
        <>
          <span
            className="absolute -inset-[5px] rounded-full animate-spin-fast"
            style={{ background: `conic-gradient(${persona.color}, transparent 55%, ${persona.color})` }}
          />
          <span className="absolute -inset-3 rounded-full opacity-40 blur-md animate-pulse" style={{ backgroundColor: persona.color }} />
        </>
      )}

      <span
        className={`absolute inset-0 overflow-hidden rounded-full transition ${dim ? "opacity-45 grayscale" : ""}`}
        style={{
          background: `linear-gradient(140deg, ${persona.from}, ${persona.to})`,
          boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.18), 0 10px 30px -12px ${persona.color}`,
        }}
      >
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden>
          <circle cx="50" cy="12" r="18" fill="white" fillOpacity="0.12" />
          <circle cx="32" cy="26" r="12" fill="white" fillOpacity="0.95" />
          <path d="M8 66c1.5-15 11.5-23 24-23s22.5 8 24 23z" fill="white" fillOpacity="0.95" />
          {human ? (
            <>
              <circle cx="27.5" cy="26" r="1.8" fill={persona.from} />
              <circle cx="36.5" cy="26" r="1.8" fill={persona.from} />
              <path d="M27 31c3 2.5 7 2.5 10 0" stroke={persona.from} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <rect x="22" y="22.5" width="20" height="7" rx="3.5" fill={persona.from} />
              <rect x="25" y="24.6" width="14" height="2.8" rx="1.4" fill={persona.to} className={status === "working" ? "animate-pulse" : ""} />
              <line x1="32" y1="14" x2="32" y2="9" stroke="white" strokeWidth="1.6" strokeOpacity="0.95" />
              <circle cx="32" cy="8" r="2" fill={persona.to} />
            </>
          )}
        </svg>
      </span>

      <span
        className="absolute -bottom-1 -left-1 grid place-items-center rounded-full ring-[3px] ring-[#0b1020]"
        style={{ width: badge, height: badge, backgroundColor: persona.color }}
      >
        <Icon className="text-[#0b1020]" style={{ width: badge * 0.58, height: badge * 0.58 }} strokeWidth={2.4} />
      </span>

      {status && (
        <span
          className="absolute top-0 right-0 rounded-full ring-[3px] ring-[#0b1020]"
          style={{ width: Math.max(10, size * 0.2), height: Math.max(10, size * 0.2), backgroundColor: DOT[status] }}
        />
      )}
    </span>
  );
}
