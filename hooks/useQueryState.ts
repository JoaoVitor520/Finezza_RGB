"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useQueryState<T extends string>(
  key: string,
  defaultValue: T,
  allowed: readonly T[]
): [T, (value: T) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawValue = searchParams.get(key);
  const isAllowed = rawValue && allowed.includes(rawValue as T);
  const derivedValue = (isAllowed ? rawValue : defaultValue) as T;
  const [state, setState] = React.useState<T>(derivedValue);

  React.useEffect(() => {
    setState(derivedValue);
  }, [derivedValue]);

  const setQueryState = React.useCallback(
    (value: T) => {
      setState(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const query = params.toString();
      const base =
        typeof window !== "undefined" ? window.location.pathname : "/";
      router.replace(query ? `${base}?${query}` : base, { scroll: false });
    },
    [defaultValue, key, router, searchParams]
  );

  return [state, setQueryState];
}
