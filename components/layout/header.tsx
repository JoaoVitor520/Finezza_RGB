"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";

export function Header() {
  return (
    <header className="sticky top-6 z-30">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-lg shadow-indigo-500/10 backdrop-blur-xl">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Dashboard
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Finezza_RB</h1>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-slate-500 shadow-sm ring-1 ring-white/60 backdrop-blur md:flex">
            <Search className="h-4 w-4" />
            <span className="text-sm">Buscar pacientes</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full"
            aria-label="Notificacoes"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.9)]" />
          </Button>

          <div className="flex items-center gap-3 rounded-full bg-white/70 px-2 py-1 shadow-sm ring-1 ring-white/60">
            <Avatar fallback="RB" />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-900">Dr. Rafael Bento</p>
              <p className="text-xs text-slate-500">Odontologia premium</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}