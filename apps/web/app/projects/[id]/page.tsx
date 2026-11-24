"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useParams } from "next/navigation";
import type { Project } from "@/lib/data";
import { useProjects } from "@/lib/store";
import AuthGuard, { FullLoader } from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import Workspace from "@/components/workspace/Workspace";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  return (
    <AuthGuard>
      {(session) => (
        <AppShell session={session}>
          <Loader id={params.id} />
        </AppShell>
      )}
    </AuthGuard>
  );
}

function Loader({ id }: { id: string }) {
  const { projects, loaded, updateProject } = useProjects();
  const project = projects.find((p) => p.id === id);
  const update = useCallback((fn: (p: Project) => Project) => updateProject(id, fn), [id, updateProject]);

  if (!loaded) return <FullLoader />;
  if (!project) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-6 text-center">
        <div>
          <p className="text-xl font-bold text-white">محصول پیدا نشد</p>
          <Link href="/projects" className="mt-4 inline-block text-sm text-violet-300 hover:text-violet-200">
            بازگشت به محصولات
          </Link>
        </div>
      </div>
    );
  }
  return <Workspace key={project.id} project={project} update={update} />;
}
