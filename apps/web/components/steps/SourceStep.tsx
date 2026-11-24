"use client";

import { useState } from "react";
import { FileText, GitBranch, RefreshCw, Star, Upload, X } from "lucide-react";
import { fa, type Source } from "@/lib/data";
import { AGENT_BY_STEP } from "@/lib/agents";
import { btn, inputCls } from "../ui";
import { AgentWorking, ApprovedBar, ApproveFooter, StepFrame, type StepProps } from "./StepFrame";

export default function SourceStep({
  project,
  update,
  status,
  running,
  busy,
  liveLine,
  onApprove,
  onReopen,
  onAnalyze,
}: Omit<StepProps, "onRun"> & { onAnalyze: (src: Pick<Source, "gitUrl" | "markdown" | "markdownName">) => void }) {
  const [gitUrl, setGitUrl] = useState(project.source.gitUrl);
  const [markdown, setMarkdown] = useState(project.source.markdown);
  const [markdownName, setMarkdownName] = useState(project.source.markdownName);
  const [mode, setMode] = useState<"file" | "paste">(project.source.markdown && !project.source.markdownName ? "paste" : "file");
  const [editing, setEditing] = useState(!project.analysis);

  const approved = project.approved.source;
  const next = AGENT_BY_STEP.features.name;
  const canRun = !!gitUrl.trim() || !!markdown.trim();

  const readFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setMarkdown(String(reader.result ?? ""));
      setMarkdownName(file.name);
    };
    reader.readAsText(file);
  };

  const start = () => {
    setEditing(false);
    onAnalyze({ gitUrl: gitUrl.trim(), markdown, markdownName: mode === "file" ? markdownName : "" });
  };

  if (running) {
    return (
      <StepFrame step="source" status={status}>
        <AgentWorking step="source" liveLine={liveLine} />
      </StepFrame>
    );
  }

  if (editing || !project.analysis) {
    return (
      <StepFrame step="source" status={status}>
        <p className="mb-6 text-sm leading-7 text-slate-300">
          سلام! من کاوه‌ام. لینک مخزن گیت محصول و/یا فایل markdown مستندات را بده تا کد و محصول را تحلیل کنم.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="flex items-center gap-2 font-bold text-white">
              <GitBranch className="size-4 text-cyan-300" />
              مخزن گیت
            </p>
            <input
              dir="ltr"
              value={gitUrl}
              onChange={(e) => setGitUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className={`${inputCls} mt-4 text-left`}
            />
            <p className="mt-3 text-xs leading-6 text-slate-500">
              مخازن عمومی GitHub مستقیم خوانده می‌شوند. برای مخزن خصوصی، GITHUB_TOKEN را روی سرور تنظیم کن.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-bold text-white">
                <FileText className="size-4 text-cyan-300" />
                مستندات Markdown
              </p>
              <div className="flex rounded-lg bg-white/5 p-0.5 text-xs">
                {(["file", "paste"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-2.5 py-1 ${mode === m ? "bg-white/10 text-white" : "text-slate-400"}`}
                  >
                    {m === "file" ? "فایل" : "متن"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "file" ? (
              markdownName ? (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-cyan-500/10 px-4 py-3 text-sm">
                  <span dir="ltr" className="truncate text-cyan-100">{markdownName}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{fa(Math.ceil(markdown.length / 1024))} KB</span>
                    <button
                      onClick={() => {
                        setMarkdown("");
                        setMarkdownName("");
                      }}
                      className="text-slate-400 hover:text-rose-300"
                      aria-label="حذف فایل"
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                </div>
              ) : (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    readFile(e.dataTransfer.files?.[0]);
                  }}
                  className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-100"
                >
                  <Upload className="size-6" />
                  فایل .md را اینجا رها کن یا کلیک کن
                  <input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
                </label>
              )
            ) : (
              <textarea
                dir="auto"
                value={markdown}
                onChange={(e) => {
                  setMarkdown(e.target.value);
                  setMarkdownName("");
                }}
                rows={5}
                placeholder="# نام محصول&#10;توضیحات، ویژگی‌ها، راهنما…"
                className={`${inputCls} mt-4 resize-y font-mono text-xs leading-6`}
              />
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {project.analysis && (
            <button onClick={() => setEditing(false)} className={btn.ghost}>
              انصراف
            </button>
          )}
          <button onClick={start} disabled={!canRun || busy} className={btn.primary}>
            شروع تحلیل توسط کاوه
          </button>
        </div>
      </StepFrame>
    );
  }

  const { repo, analyzedAt } = project.source;
  const a = project.analysis;

  return (
    <StepFrame
      step="source"
      status={status}
      actions={
        !approved && (
          <>
            <button onClick={() => setEditing(true)} disabled={busy} className={btn.ghost}>
              تغییر منبع
            </button>
            <button
              onClick={() => onAnalyze({ gitUrl: project.source.gitUrl, markdown: project.source.markdown, markdownName: project.source.markdownName })}
              disabled={busy}
              className={btn.ghost}
            >
              <RefreshCw className="size-4" />
              تحلیل دوباره
            </button>
          </>
        )
      }
    >
      {approved && <ApprovedBar text="تحلیل محصول تأیید شد." onReopen={onReopen} />}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs text-slate-500">محصول</p>
          <input
            value={project.name}
            disabled={approved}
            onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
            className="mt-1 w-full rounded-lg bg-transparent text-2xl font-black text-white outline-none focus:bg-white/[0.04] disabled:opacity-100"
          />
          <p className="mt-3 text-sm leading-7 text-slate-300">{a.summary}</p>

          {a.modules.length > 0 && (
            <>
              <p className="mt-5 text-xs text-slate-500">ماژول‌های اصلی</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.modules.map((m) => (
                  <span key={m} className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-slate-200">{m}</span>
                ))}
              </div>
            </>
          )}

          {a.highlights.length > 0 && (
            <>
              <p className="mt-5 text-xs text-slate-500">یافته‌های کاوه</p>
              <ul className="mt-2 space-y-1.5">
                {a.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm text-slate-300">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-cyan-400" />
                    {h}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs text-slate-500">فناوری‌ها</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {a.techStack.map((t) => (
                <span key={t} dir="ltr" className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100">{t}</span>
              ))}
            </div>
          </div>

          {repo && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm">
              <p className="flex items-center gap-2 font-bold text-white">
                <GitBranch className="size-4 text-cyan-300" />
                <span dir="ltr" className="truncate">{repo.fullName ?? repo.url}</span>
              </p>
              {repo.provider === "github" ? (
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="فایل" value={fa(repo.fileCount)} />
                  <Stat label="شاخه" value={repo.defaultBranch ?? "-"} ltr />
                  <Stat label="ستاره" value={fa(repo.stars ?? 0)} icon />
                </dl>
              ) : (
                <p className="mt-2 text-xs text-amber-200/80">این مخزن GitHub نیست و خودکار خوانده نشد.</p>
              )}
              {repo.keyFiles.length > 0 && (
                <p dir="ltr" className="mt-3 text-left text-[11px] leading-5 text-slate-500">{repo.keyFiles.join(" · ")}</p>
              )}
            </div>
          )}

          {project.source.markdownName && (
            <p className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-slate-300">
              <FileText className="size-4 text-cyan-300" />
              <span dir="ltr">{project.source.markdownName}</span>
            </p>
          )}
          {analyzedAt && (
            <p className="text-xs text-slate-500">تحلیل در {new Date(analyzedAt).toLocaleString("fa-IR")}</p>
          )}
        </div>
      </div>

      {!approved && (
        <ApproveFooter
          label={`تأیید و ارسال به ${next}`}
          hint="اگر خلاصه درست است تأیید کن؛ نیلوفر ویژگی‌های محصول را فهرست می‌کند."
          disabled={busy}
          onApprove={onApprove}
        />
      )}
    </StepFrame>
  );
}

function Stat({ label, value, ltr, icon }: { label: string; value: string; ltr?: boolean; icon?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-2 py-2">
      <dd dir={ltr ? "ltr" : undefined} className="flex items-center justify-center gap-1 truncate font-bold text-white">
        {icon && <Star className="size-3 text-amber-300" />}
        {value}
      </dd>
      <dt className="text-[11px] text-slate-500">{label}</dt>
    </div>
  );
}
