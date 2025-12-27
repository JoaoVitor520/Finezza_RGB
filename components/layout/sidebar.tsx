"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutGrid,
  Plus,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { ClinicSwitcher } from "./clinic-switcher";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Prontuarios", href: "/prontuarios", icon: FileText },
  { label: "Financeiro", href: "/financeiro", icon: CreditCard },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings },
];

const itemVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
};

const iconVariants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: -6, scale: 1.08 },
};

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (value: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

type SidebarContentProps = {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavClick?: () => void;
  onClose?: () => void;
  showClose?: boolean;
};

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onNavClick,
  onClose,
  showClose,
}: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col justify-between rounded-r-3xl border border-white/40 bg-white/70 p-4 shadow-xl shadow-indigo-500/20 backdrop-blur-2xl">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="brand"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    Finezza_RB
                  </p>
                  <p className="text-xs text-slate-500">Clinica digital</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            {showClose && onClose ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 rounded-full lg:hidden"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}

            {onToggleCollapse ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="hidden h-9 w-9 rounded-full lg:inline-flex"
                aria-label="Alternar sidebar"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {!collapsed ? (
          <div className="mt-4">
            <ClinicSwitcher className="w-full justify-between" />
          </div>
        ) : null}

        <nav className="mt-6 space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial="rest"
                animate="rest"
                whileHover="hover"
                variants={itemVariants}
              >
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-white/80 text-slate-900 shadow-md shadow-indigo-500/10 ring-1 ring-white/60"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  )}
                >
                  <motion.span
                    variants={iconVariants}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      active
                        ? "bg-indigo-500/10 text-indigo-600"
                        : "bg-white/60 text-slate-600"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </motion.span>

                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/70 p-3 shadow-lg shadow-indigo-500/10 backdrop-blur-xl">
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              key="cta-expanded"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Acesso rapido
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                Nova consulta
              </p>
              <Button variant="glow" className="mt-3 w-full">
                Criar agenda
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="cta-collapsed"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-center justify-center"
            >
              <Button variant="glow" size="icon" aria-label="Criar agenda">
                <Plus className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [hovered, setHovered] = React.useState(false);

  const isCollapsed = collapsed && !hovered;

  const handleNavClick = React.useCallback(() => {
    if (isDesktop) {
      onCollapse(true);
    } else {
      onMobileClose();
    }
  }, [isDesktop, onCollapse, onMobileClose]);

  return (
    <>
      <motion.aside
        className="sticky top-0 hidden h-screen flex-shrink-0 lg:block"
        animate={{ width: isCollapsed ? 92 : 260 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarContent
          collapsed={isCollapsed}
          onToggleCollapse={() => onCollapse(!collapsed)}
          onNavClick={handleNavClick}
        />
      </motion.aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              className="relative h-full w-72 max-w-[82vw]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
            >
              <SidebarContent
                collapsed={false}
                onNavClick={handleNavClick}
                onClose={onMobileClose}
                showClose
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
