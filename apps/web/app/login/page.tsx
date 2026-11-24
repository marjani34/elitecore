"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { api, errorText } from "@/lib/api";
import { useSession } from "@/lib/store";
import AgentOrb from "@/components/agent/AgentOrb";
import AgentAvatar from "@/components/agents/AgentAvatar";
import { inputCls } from "@/components/ui";

export default function LoginPage() {
  const { setSession } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await api.login(email.trim(), password);
      setSession(session);
      router.replace("/projects");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="pointer-events-none fixed inset-0 bg-dots" />

      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-xl font-black text-white shadow-lg shadow-violet-500/30">
              ا
            </span>
            <span className="text-2xl font-black text-white">الیت</span>
          </div>

          <h1 className="mt-10 text-3xl font-black text-white">ورود ادمین</h1>
          <p className="mt-2 text-sm text-slate-400">تیم عامل‌های هوشمند منتظر توست.</p>

          <div className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">ایمیل</span>
              <input dir="ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@elite.app" className={`${inputCls} py-3 text-left`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-300">رمز عبور</span>
              <input dir="ltr" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${inputCls} py-3 text-left`} />
            </label>
          </div>

          {error && <p className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-500 py-3.5 font-bold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-40"
          >
            {loading && <LoaderCircle className="size-5 animate-spin" />}
            ورود
          </button>

          {process.env.NODE_ENV === "development" && (
            <p dir="ltr" className="mt-4 text-center text-xs text-slate-500">
              dev: admin@elite.app / admin123 (or the values in apps/api/.env)
            </p>
          )}
        </form>
      </div>

      <div className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-violet-950/60 via-[#0a0f24] to-cyan-950/40 lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="absolute top-1/3 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/25 blur-[120px]" />

        <div className="relative size-[380px]">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-[18%] rounded-full border border-dashed border-violet-400/15 animate-spin-reverse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <AgentOrb size={110} />
          </div>
          {AGENTS.map((a, i) => {
            const angle = (i / AGENTS.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <div
                key={a.key}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center animate-float-slow"
                style={{ left: `${50 + 46 * Math.cos(angle)}%`, top: `${50 + 46 * Math.sin(angle)}%`, animationDelay: `${i * 0.4}s` }}
              >
                <AgentAvatar persona={a} size={56} />
                <span className="mt-2 text-xs font-bold text-white">{a.name}</span>
                <span className="text-[10px] text-slate-400">{a.role}</span>
              </div>
            );
          })}
        </div>

        <h2 className="relative mt-14 text-center text-3xl font-black leading-[1.5] text-white">
          شش عامل هوشمند،
          <br />
          <span className="bg-gradient-to-l from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">یک تحویل بی‌دردسر</span>
        </h2>
        <p className="relative mt-4 max-w-sm text-center text-sm leading-7 text-slate-400">
          از خواندن سورس‌کد تا گزارش نهایی؛ هر مرحله را یک عامل متخصص انجام می‌دهد و تو تأیید می‌کنی.
        </p>
      </div>
    </div>
  );
}
