"use client";

import type { AiVerdict, Analysis, Priority, RepoInfo, Session } from "./data";

// In production the API is served from the same domain under /api (see vercel.json services).
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001/api")
).replace(/\/$/, "");
export const SESSION_KEY = "elite:session";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function token(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? ((JSON.parse(raw) as Session | null)?.token ?? null) : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const t = token();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("اتصال به سرور برقرار نشد. مطمئن شو بک‌اند در حال اجراست.", 0);
  }

  const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") {
      window.localStorage.removeItem(SESSION_KEY);
      window.location.href = "/login";
    }
    const m = data.message;
    throw new ApiError(Array.isArray(m) ? m.join("، ") : (m ?? `خطای سرور (${res.status})`), res.status);
  }
  return data as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : "خطای ناشناخته");

export interface AiFeature {
  title: string;
  description: string;
  priority: Priority;
}
export interface AiJourney {
  featureId: string;
  title: string;
  steps: string[];
}
export interface AiCriterion {
  featureId: string;
  text: string;
  priority: Priority;
}
export interface AiReview {
  id: string;
  verdict: AiVerdict;
  reason: string;
}
type Demo = { demo?: boolean };

export const api = {
  login: (email: string, password: string) => request<Session>("/auth/login", { email, password }),
  health: () => request<{ status: string; aiMode: "demo" | "live" }>("/health"),

  analyze: (b: { gitUrl: string; markdown: string; markdownName: string }) =>
    request<{ repo?: RepoInfo; analysis: Analysis; context: string } & Demo>("/sources/analyze", b),

  features: (b: { analysis?: Analysis; context: string }) =>
    request<{ features: AiFeature[] } & Demo>("/agents/features", b),

  journeys: (b: { analysis?: Analysis; features: { id: string; title: string; description: string; priority: Priority }[] }) =>
    request<{ journeys: AiJourney[] } & Demo>("/agents/journeys", b),

  criteria: (b: {
    analysis?: Analysis;
    features: { id: string; title: string; description: string; priority: Priority }[];
    journeys: { featureId: string; title: string; steps: string[] }[];
  }) => request<{ criteria: AiCriterion[] } & Demo>("/agents/criteria", b),

  review: (b: { analysis?: Analysis; context: string; criteria: { id: string; text: string; feature: string }[] }) =>
    request<{ reviews: AiReview[] } & Demo>("/agents/review", b),

  report: (b: { metrics: unknown; features: unknown; criteria: unknown }) =>
    request<{ summary: string; recommendation: string; risks: string[] } & Demo>("/agents/report", b),
};
