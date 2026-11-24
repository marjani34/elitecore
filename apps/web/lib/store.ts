"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Project, Session } from "./data";
import { api, errorText, SESSION_KEY } from "./api";
import { usePersistentState } from "./use-persistent-state";

export function useSession() {
  const [session, setSession, loaded] = usePersistentState<Session | null>(SESSION_KEY, null);
  return { session, setSession, loaded };
}

export type ProjectUpdater = (fn: (p: Project) => Project) => void;
export type SaveState = "idle" | "saving" | "saved" | "error";

/** Products kept in the browser by earlier versions; uploaded once to the database. */
const LEGACY_KEY = "elite:products:v2";

async function importLegacyProducts(): Promise<boolean> {
  let legacy: Project[] = [];
  try {
    legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "[]") as Project[];
  } catch {
    return false;
  }
  if (!Array.isArray(legacy) || !legacy.length) return false;
  for (const p of legacy) await api.saveProduct(p);
  window.localStorage.removeItem(LEGACY_KEY);
  return true;
}

/** The product list, loaded from the API. */
export function useProductList() {
  const [products, setProducts] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const imported = await importLegacyProducts().catch(() => false);
      const list = await api.listProducts();
      setProducts(list);
      if (imported) setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await api.deleteProduct(id);
    setProducts((list) => list.filter((p) => p.id !== id));
  }, []);

  return { products, loaded, error, reload: load, remove };
}

/**
 * One product, loaded from the API. Changes apply locally at once and are saved
 * to the database shortly after (debounced), so the UI stays fast.
 */
export function useProduct(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const ref = useRef<Project | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const inFlight = useRef(false);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    // One save at a time; a change made meanwhile is saved right after.
    if (inFlight.current || !dirty.current || !ref.current) return;
    inFlight.current = true;
    dirty.current = false;
    setSaveState("saving");
    try {
      await api.saveProduct(ref.current);
      setSaveState(dirty.current ? "saving" : "saved");
    } catch {
      dirty.current = true;
      setSaveState("error");
      return;
    } finally {
      inFlight.current = false;
    }
    if (dirty.current) await flush();
  }, []);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    api
      .getProduct(id)
      .then((p) => {
        if (!alive) return;
        ref.current = p;
        setProject(p);
      })
      .catch((e) => alive && setError(errorText(e)))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [id]);

  // Save pending changes when leaving the page.
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  const update = useCallback<ProjectUpdater>(
    (fn) => {
      if (!ref.current) return;
      const next = fn(ref.current);
      ref.current = next;
      setProject(next);
      dirty.current = true;
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  return { project, loaded, error, update, saveState, retrySave: flush };
}
