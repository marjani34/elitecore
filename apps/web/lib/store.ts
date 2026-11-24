"use client";

import { useCallback } from "react";
import type { Project, Session } from "./data";
import { SESSION_KEY } from "./api";
import { usePersistentState } from "./use-persistent-state";

export function useSession() {
  const [session, setSession, loaded] = usePersistentState<Session | null>(SESSION_KEY, null);
  return { session, setSession, loaded };
}

export type ProjectUpdater = (fn: (p: Project) => Project) => void;

/** Products are kept in the browser until the database is added. */
export function useProjects() {
  const [projects, setProjects, loaded] = usePersistentState<Project[]>("elite:products:v2", []);

  const addProject = useCallback((p: Project) => setProjects((list) => [p, ...list]), [setProjects]);
  const updateProject = useCallback(
    (id: string, fn: (p: Project) => Project) => setProjects((list) => list.map((p) => (p.id === id ? fn(p) : p))),
    [setProjects],
  );
  const removeProject = useCallback(
    (id: string) => setProjects((list) => list.filter((p) => p.id !== id)),
    [setProjects],
  );

  return { projects, loaded, addProject, updateProject, removeProject };
}
