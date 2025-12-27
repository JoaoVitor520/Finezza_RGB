"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { useAuthSession } from "../../hooks/useAuthSession";
import { supabase } from "../../lib/supabase/client";
import { ClinicSwitcher } from "./clinic-switcher";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { user } = useAuthSession();

  const handleSignOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  return (
    <header className="sticky top-6 z-30">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/40 bg-white/70 px-4 py-3 shadow-lg shadow-indigo-500/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Dashboard
            </p>
            <h1 className="text-xl font-semibold text-slate-900">
              Finezza_RB
            </h1>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-slate-500 shadow-sm ring-1 ring-white/60 backdrop-blur lg:flex">
            <Search className="h-4 w-4" />
            <span className="text-sm">Buscar pacientes</span>
          </div>

          <ClinicSwitcher className="hidden lg:flex" />

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
            <Avatar fallback={(user?.email ?? "RB").slice(0, 2).toUpperCase()} />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-900">
                {user?.user_metadata?.full_name ?? "Conta ativa"}
              </p>
              <p className="text-xs text-slate-500">{user?.email ?? ""}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handleSignOut}
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
