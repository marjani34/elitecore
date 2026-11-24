"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/data";
import { useProjects } from "@/lib/store";
import AuthGuard, { FullLoader } from "@/components/AuthGuard";

export default function NewProjectPage() {
  return <AuthGuard>{() => <Create />}</AuthGuard>;
}

function Create() {
  const { loaded, addProject } = useProjects();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (!loaded || done.current) return;
    done.current = true;
    const p = createProject();
    addProject(p);
    router.replace(`/projects/${p.id}`);
  }, [loaded, addProject, router]);

  return <FullLoader />;
}
