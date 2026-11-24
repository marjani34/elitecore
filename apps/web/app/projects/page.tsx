"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AGENTS, AGENT_BY_STEP } from "@/lib/agents";
import { currentStep, fa, stepDone, stepMeta, type Project } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { errorText } from "@/lib/api";
import { useProductList } from "@/lib/store";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import AgentAvatar from "@/components/agents/AgentAvatar";
import AgentOrb from "@/components/agent/AgentOrb";

export default function ProjectsPage() {
  return (
    <AuthGuard>
      {(session) => (
        <AppShell session={session}>
          <List />
        </AppShell>
      )}
    </AuthGuard>
  );
}

function List() {
  const { products: projects, loaded, error, reload, remove } = useProductList();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">محصولات</h1>
          <p className="mt-2 text-sm text-slate-400">هر محصول را تیم عامل‌ها مرحله‌به‌مرحله برای تحویل بررسی می‌کنند.</p>
        </div>
        {projects.length > 0 && (
          <Link href="/projects/new" className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
            <Plus className="size-4" />
            بررسی محصول جدید
          </Link>
        )}
      </div>

      {!loaded && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shimmer h-64 rounded-3xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
          <button onClick={() => void reload()} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15">
            تلاش دوباره
          </button>
        </div>
      )}

      {loaded && !error && projects.length === 0 && (
        <div className="mt-12 flex flex-col items-center rounded-[2rem] border border-white/10 bg-gradient-to-b from-violet-500/10 to-transparent px-6 py-16 text-center">
          <AgentOrb size={90} rings />
          <div className="mt-14 flex -space-x-3 space-x-reverse">
            {AGENTS.map((a) => (
              <span key={a.key} className="rounded-full ring-4 ring-[#0b1020]">
                <AgentAvatar persona={a} size={48} />
              </span>
            ))}
          </div>
          <h2 className="mt-6 text-2xl font-black text-white">تیمت آماده است</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-400">
            لینک گیت یا فایل markdown محصول را بده؛ کاوه تحلیلش می‌کند و کار مرحله‌به‌مرحله بین عامل‌ها دست‌به‌دست می‌شود.
          </p>
          <Link href="/projects/new" className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-500 to-fuchsia-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110">
            <Plus className="size-5" />
            شروع بررسی اولین محصول
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} project={p} onRemove={() => remove(p.id)} />
        ))}
      </div>
    </div>
  );
}

function Card({ project, onRemove }: { project: Project; onRemove: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const step = currentStep(project);
  const agent = AGENT_BY_STEP[step];
  const m = computeMetrics(project);
  const finished = !!project.report;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1328]/80 backdrop-blur transition hover:-translate-y-1 hover:border-white/20">
      <Link href={`/projects/${project.id}`} className="block p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {AGENTS.map((a) => (
              <span
                key={a.key}
                className="h-1.5 w-6 rounded-full"
                style={{ backgroundColor: stepDone(project, a.step) ? a.color : "rgba(255,255,255,0.1)" }}
                title={a.name}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500">{new Date(project.createdAt).toLocaleDateString("fa-IR")}</span>
        </div>

        <h3 className="mt-5 text-xl font-extrabold text-white">{project.name}</h3>
        <p dir="ltr" className="mt-1 truncate text-right text-xs text-slate-500">
          {project.source.repo?.fullName ?? (project.source.gitUrl || project.source.markdownName || "—")}
        </p>
        <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-400">{project.analysis?.summary ?? "هنوز تحلیل نشده است."}</p>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <AgentAvatar persona={agent} size={36} status={finished ? "done" : "waiting"} />
            <div>
              <p className="text-xs text-slate-500">{finished ? "گزارش آماده است" : "مرحله فعلی"}</p>
              <p className="text-sm font-bold text-white">
                {finished ? `آمادگی ٪${fa(m.readiness)}` : `${stepMeta(step).title} · ${agent.name}`}
              </p>
            </div>
          </div>
          {finished && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.ready ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200"}`}>
              {m.ready ? "آماده تحویل" : "نیاز به اصلاح"}
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={() => setConfirming(true)}
        className="absolute bottom-[5.5rem] left-5 rounded-lg p-1.5 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-300"
        aria-label="حذف"
      >
        <Trash2 className="size-4" />
      </button>

      {confirming && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0b1020]/95 p-6 text-center">
          <p className="text-sm text-slate-200">«{project.name}» برای همیشه حذف شود؟</p>
          {deleteError && <p className="text-xs text-rose-300">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                onRemove()
                  .catch((e) => setDeleteError(errorText(e)))
                  .finally(() => setDeleting(false));
              }}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {deleting ? "در حال حذف…" : "حذف"}
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-slate-200">انصراف</button>
          </div>
        </div>
      )}
    </div>
  );
}
