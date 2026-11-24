"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useProduct } from "@/lib/store";
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
  const { project, loaded, error, update, saveState, retrySave } = useProduct(id);

  if (!loaded) return <FullLoader />;
  if (!project) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-6 text-center">
        <div>
          <p className="text-xl font-bold text-white">{error || "محصول پیدا نشد"}</p>
          <Link href="/projects" className="mt-4 inline-block text-sm text-violet-300 hover:text-violet-200">
            بازگشت به محصولات
          </Link>
        </div>
      </div>
    );
  }
  return <Workspace key={project.id} project={project} update={update} saveState={saveState} onRetrySave={retrySave} />;
}
