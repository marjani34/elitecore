"use client";

import { ADMIN, AGENTS } from "@/lib/agents";
import { fa, stepMeta } from "@/lib/data";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import AgentAvatar from "@/components/agents/AgentAvatar";

export default function TeamPage() {
  return (
    <AuthGuard>
      {(session) => (
        <AppShell session={session}>
          <Team />
        </AppShell>
      )}
    </AuthGuard>
  );
}

function Team() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-black text-white">تیم عامل‌ها</h1>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
        هر مرحله از تحویل محصول را یک عامل هوشمند متخصص انجام می‌دهد. کار هر عامل پس از تأیید تو به عامل بعدی سپرده می‌شود.
      </p>

      {/* Org chart */}
      <div className="relative mt-12">
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center rounded-3xl border border-amber-400/30 bg-amber-500/[0.07] px-8 py-6 text-center">
            <AgentAvatar persona={ADMIN} size={84} human />
            <p className="mt-4 text-lg font-black text-white">ادمین</p>
            <p className="text-xs text-amber-200/80">{ADMIN.role}</p>
          </div>
          <div className="h-10 w-px bg-gradient-to-b from-amber-400/60 to-white/10" />
        </div>

        <div className="relative">
          <div className="absolute top-0 right-[8%] left-[8%] hidden h-px bg-white/10 lg:block" />
          <div className="grid gap-5 pt-0 sm:grid-cols-2 lg:grid-cols-3 lg:pt-10">
            {AGENTS.map((a, i) => (
              <article
                key={a.key}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1328]/80 p-6 backdrop-blur"
                style={{ boxShadow: `0 30px 60px -40px ${a.color}` }}
              >
                <div className="pointer-events-none absolute -top-16 -left-16 size-44 rounded-full opacity-25 blur-3xl" style={{ backgroundColor: a.color }} />
                <div className="relative flex items-center gap-4">
                  <AgentAvatar persona={a} size={68} status="ready" />
                  <div>
                    <p className="text-lg font-black text-white">{a.name}</p>
                    <p className="text-sm" style={{ color: a.color }}>{a.role}</p>
                    <p dir="ltr" className="text-right text-[11px] text-slate-500">{a.roleEn}</p>
                  </div>
                </div>
                <p className="relative mt-4 text-sm leading-7 text-slate-300">{a.bio}</p>
                <div className="relative mt-4 flex flex-wrap gap-1.5">
                  {a.skills.map((s) => (
                    <span key={s} className="rounded-lg px-2 py-1 text-[11px]" style={{ backgroundColor: `${a.color}1a`, color: a.color }}>
                      {s}
                    </span>
                  ))}
                </div>
                <p className="relative mt-5 border-t border-white/5 pt-4 text-xs text-slate-400">
                  مسئول مرحله {fa(i + 1)}: <span className="font-bold text-white">{stepMeta(a.step).title}</span>
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
