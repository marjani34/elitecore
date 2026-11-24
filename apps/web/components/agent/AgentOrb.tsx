/** The agent's visual identity: a glowing, rotating orb. */
export default function AgentOrb({
  size = 40,
  thinking = false,
  rings = false,
}: {
  size?: number;
  thinking?: boolean;
  rings?: boolean;
}) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {rings && (
        <>
          <span className="absolute -inset-[18%] rounded-full border border-violet-400/20 animate-spin-reverse" style={{ borderStyle: "dashed" }} />
          <span className="absolute -inset-[38%] rounded-full border border-cyan-300/10" />
          <span className="absolute -inset-[60%] rounded-full border border-fuchsia-300/[0.07]" />
        </>
      )}
      <span
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 blur-md transition ${
          thinking ? "animate-pulse opacity-100" : "opacity-50"
        }`}
      />
      <span
        className={`absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#8b5cf6,#ec4899,#22d3ee,#8b5cf6)] ${
          thinking ? "animate-spin-fast" : "animate-spin-slow"
        }`}
      />
      <span className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.55),#1e1b4b_62%)]" />
      <span className="absolute top-[22%] right-[28%] h-[14%] w-[14%] rounded-full bg-white/80 blur-[1px]" />
    </span>
  );
}
