"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * useState saved to localStorage (front-end only, until the API stores data).
 * Writes happen synchronously, so data is safe even when navigating right after an update.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        ref.current = parsed;
        setValue(parsed);
      }
    } catch {
      // ignore unreadable storage
    }
    setLoaded(true);
  }, [key]);

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (action) => {
      const next = typeof action === "function" ? (action as (prev: T) => T)(ref.current) : action;
      ref.current = next;
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    },
    [key],
  );

  return [value, set, loaded];
}
