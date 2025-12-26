"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "glow";

type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:pointer-events-none disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "bg-slate-900 text-white shadow-md shadow-slate-900/20 hover:shadow-lg",
  secondary:
    "bg-white/70 text-slate-900 shadow-md shadow-indigo-500/10 ring-1 ring-white/70 backdrop-blur",
  outline:
    "border border-slate-200/80 bg-white/50 text-slate-700 shadow-sm hover:border-indigo-200",
  ghost: "bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900",
  glow:
    "bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-11 px-4",
  sm: "h-9 px-3",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  disabled,
  type = "button",
  whileHover,
  whileTap,
  ...props
}: ButtonProps) {
  const hover = disabled ? undefined : whileHover ?? { scale: 1.02 };
  const tap = disabled ? undefined : whileTap ?? { scale: 0.98 };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={hover}
      whileTap={tap}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  );
}
