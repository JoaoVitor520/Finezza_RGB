"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "../../hooks/useAuthSession";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, isLoading } = useAuthSession();

  React.useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace("/login");
    }
  }, [isLoading, router, session]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
