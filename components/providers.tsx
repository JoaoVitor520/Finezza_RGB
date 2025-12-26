"use client";

import * as React from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        richColors
        expand
        closeButton
        toastOptions={{
          className:
            "rounded-2xl border border-white/40 bg-white/80 text-slate-900 shadow-lg shadow-indigo-500/10 backdrop-blur-xl",
          descriptionClassName: "text-slate-500",
        }}
      />
    </>
  );
}