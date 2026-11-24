"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/store";
import { FullLoader } from "@/components/AuthGuard";

export default function Home() {
  const { session, loaded } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loaded) router.replace(session ? "/projects" : "/login");
  }, [loaded, session, router]);

  return <FullLoader />;
}
