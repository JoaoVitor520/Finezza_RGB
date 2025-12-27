"use client";

import * as React from "react";
import { supabase } from "../lib/supabase/client";
import { useAuthSession } from "./useAuthSession";

type Clinic = {
  id: string;
  slug: string;
  name: string;
};

type ActiveClinicState = {
  clinics: Clinic[];
  activeClinic: Clinic | null;
  isLoading: boolean;
  setActiveSlug: (slug: string) => void;
};

const STORAGE_KEY = "finezza.active_clinic";

export function useActiveClinic(): ActiveClinicState {
  const { user } = useAuthSession();
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveSlug(stored);
  }, []);

  React.useEffect(() => {
    if (!user) {
      setClinics([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    supabase
      .from("clinics")
      .select("id, slug, name")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setClinics([]);
          setIsLoading(false);
          return;
        }
        setClinics(data ?? []);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const setActiveSlugSafe = React.useCallback((slug: string) => {
    setActiveSlug(slug);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, slug);
    }
  }, []);

  const activeClinic =
    clinics.find((clinic) => clinic.slug === activeSlug) ?? clinics[0] ?? null;

  React.useEffect(() => {
    if (!activeClinic || activeSlug === activeClinic.slug) return;
    setActiveSlugSafe(activeClinic.slug);
  }, [activeClinic, activeSlug, setActiveSlugSafe]);

  return {
    clinics,
    activeClinic,
    isLoading,
    setActiveSlug: setActiveSlugSafe,
  };
}
