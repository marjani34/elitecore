"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errorText } from "@/lib/api";
import { createProject } from "@/lib/data";
import AuthGuard, { FullLoader } from "@/components/AuthGuard";

export default function NewProjectPage() {
  return <AuthGuard>{() => <Create />}</AuthGuard>;
}

function Create() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const p = createProject();
    api
      .saveProduct(p)
      .then(() => router.replace(`/projects/${p.id}`))
      .catch((e) => setError(errorText(e)));
  }, [router]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold text-white">ساخت محصول ناموفق بود</p>
          <p className="mt-2 text-sm text-rose-200">{error}</p>
          <Link href="/projects" className="mt-6 inline-block text-sm text-violet-300 hover:text-violet-200">
            بازگشت به محصولات
          </Link>
        </div>
      </div>
    );
  }
  return <FullLoader />;
}
