"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, LogOut, Plus, UsersRound } from "lucide-react";
import { ADMIN, AGENTS } from "@/lib/agents";
import type { Session } from "@/lib/data";
import { useSession } from "@/lib/store";
import AgentAvatar from "./agents/AgentAvatar";

export function Logo() {
  return (
    <Link href="/projects" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-violet-500/30">
        ا
      </span>
      <span>
        <span className="block text-lg font-extrabold leading-tight text-white">الیت</span>
        <span className="block text-[11px] text-slate-400">تیم هوشمند تحویل محصول</span>
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/projects", label: "محصولات", icon: Boxes },
  { href: "/team", label: "تیم عامل‌ها", icon: UsersRound },
];

export default function AppShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const { setSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const logout = () => {
    setSession(null);
    router.replace("/login");
  };

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-dots" />
      <div className="pointer-events-none fixed -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-violet-600/20 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[140px]" />

      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col border-l border-white/5 bg-[#080d1e]/85 p-5 backdrop-blur-xl lg:flex">
        <Logo />

        <Link href="/projects/new" className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
          <Plus className="size-4" />
          بررسی محصول جدید
        </Link>

        <nav className="mt-6 space-y-1 text-sm">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                  active ? "bg-white/[0.07] font-semibold text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          <p className="mb-3 text-xs text-slate-500">تیم شما</p>
          <div className="flex -space-x-2 space-x-reverse">
            {AGENTS.map((a) => (
              <span key={a.key} title={`${a.name} · ${a.role}`} className="rounded-full ring-2 ring-[#080d1e]">
                <AgentAvatar persona={a} size={30} />
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-2xl border border-white/5 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <AgentAvatar persona={ADMIN} size={38} human />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{session.user.name}</p>
              <p dir="ltr" className="truncate text-right text-[11px] text-slate-400">{session.user.email}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-rose-300" title="خروج">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#080d1e]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/team" className="grid size-9 place-items-center rounded-lg bg-white/5 text-slate-300" aria-label="تیم">
            <UsersRound className="size-4" />
          </Link>
          <Link href="/projects/new" className="grid size-9 place-items-center rounded-lg bg-violet-500 text-white" aria-label="محصول جدید">
            <Plus className="size-4" />
          </Link>
          <button onClick={logout} className="grid size-9 place-items-center rounded-lg bg-white/5 text-slate-300" aria-label="خروج">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="relative lg:pr-64">{children}</main>
    </div>
  );
}
