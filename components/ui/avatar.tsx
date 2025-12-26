"use client";

import { cn } from "../../lib/utils";

type AvatarProps = {
  src?: string;
  alt?: string;
  fallback: string;
  className?: string;
};

export function Avatar({ src, alt = "User avatar", fallback, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 p-[2px]",
        className
      )}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900/80 text-xs font-semibold uppercase text-white">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    </div>
  );
}
