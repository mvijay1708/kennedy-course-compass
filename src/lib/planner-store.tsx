import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { SECTION_BY_ID, groupKey, type Section } from "./courses";
import type { Profile } from "./matching";

export const DEFAULT_PROFILE: Profile = {
  term: "2026 Fall",
  goals: "",
  skills: "",
  chips: [],
  areas: [],
  targetCredits: 16,
  unavailable: [],
};

const STORAGE_KEY = "hks-course-planner:v1";

type Stored = { profile: Profile; plan: string[] };

type PlannerContextValue = {
  ready: boolean;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  resetProfile: () => void;
  planIds: string[];
  plan: Section[];
  inPlan: (id: string) => boolean;
  /** Adds a section; replaces another section of the same course if present. */
  addSection: (id: string) => void;
  removeSection: (id: string) => void;
  planSectionForCourse: (courseKey: string) => Section | undefined;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

function loadStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
      plan: Array.isArray(parsed.plan) ? parsed.plan.filter((id) => SECTION_BY_ID.has(id)) : [],
    };
  } catch {
    return null;
  }
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [planIds, setPlanIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setProfile(stored.profile);
      setPlanIds(stored.plan);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, plan: planIds } satisfies Stored));
    } catch {
      // Storage full or disabled: the plan still works for this visit.
    }
  }, [ready, profile, planIds]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }));
  }, []);
  const resetProfile = useCallback(() => setProfile(DEFAULT_PROFILE), []);

  const addSection = useCallback((id: string) => {
    const s = SECTION_BY_ID.get(id);
    if (!s) return;
    setPlanIds((ids) => [
      ...ids.filter((other) => {
        const o = SECTION_BY_ID.get(other);
        return o && groupKey(o) !== groupKey(s);
      }),
      id,
    ]);
  }, []);
  const removeSection = useCallback((id: string) => setPlanIds((ids) => ids.filter((x) => x !== id)), []);

  const value = useMemo<PlannerContextValue>(() => {
    const plan = planIds.map((id) => SECTION_BY_ID.get(id)).filter((s): s is Section => !!s);
    return {
      ready,
      profile,
      updateProfile,
      resetProfile,
      planIds,
      plan,
      inPlan: (id) => planIds.includes(id),
      addSection,
      removeSection,
      planSectionForCourse: (key) => plan.find((s) => groupKey(s) === key),
    };
  }, [ready, profile, planIds, updateProfile, resetProfile, addSection, removeSection]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used inside PlannerProvider");
  return ctx;
}
