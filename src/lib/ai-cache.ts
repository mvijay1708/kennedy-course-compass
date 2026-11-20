import type { AiPick } from "./ai-match.functions";

const KEY = "hks-course-planner:ai-cache:v2";
const MAX = 12;

type Entry = { k: string; picks: AiPick[] };

/** Browser-only: call from query functions or effects, never during render. */
export function readAiCache(k: string): AiPick[] | null {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Entry[];
    return list.find((e) => e.k === k)?.picks ?? null;
  } catch {
    return null;
  }
}

export function writeAiCache(k: string, picks: AiPick[]): void {
  try {
    const list = (JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Entry[]).filter(
      (e) => e.k !== k,
    );
    list.unshift({ k, picks });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Ignore storage errors; the AI result still shows for this visit.
  }
}
