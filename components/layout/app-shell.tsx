"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { AuthGuard } from "../auth/auth-guard";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export function AppShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isDesktop) {
      setCollapsed(false);
    }
  }, [isDesktop]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleMobileOpen = React.useCallback(() => {
    setMobileOpen(true);
  }, []);

  const handleMobileClose = React.useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleCollapse = React.useCallback((value: boolean) => {
    setCollapsed(value);
  }, []);

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onCollapse={handleCollapse}
          mobileOpen={mobileOpen}
          onMobileClose={handleMobileClose}
        />
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-10">
            <Header onMenuClick={handleMobileOpen} />
            <main className="mt-6">{children}</main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
