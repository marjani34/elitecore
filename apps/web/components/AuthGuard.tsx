"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/data";
import { useSession } from "@/lib/store";
import AgentOrb from "./agent/AgentOrb";

export function FullLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <AgentOrb size={56} thinking />
    </div>
  );
}

/** Sends visitors without a session to /login. The API checks the token on every call. */
export default function AuthGuard({ children }: { children: (session: Session) => React.ReactNode }) {
  const { session, loaded } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loaded && !session) router.replace("/login");
  }, [loaded, session, router]);

  if (!loaded || !session) return <FullLoader />;
  return <>{children(session)}</>;
}
