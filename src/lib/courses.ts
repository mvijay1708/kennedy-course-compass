import raw from "@/data/courses.json";

export type Section = {
  id: string;
  courseNumber: string;
  title: string;
  instructors: string;
  term: string;
  session: string;
  section: string;
  dates: string;
  days: string[];
  start: string | null;
  end: string | null;
  credits: number;
  area: string | null;
  consent: string | null;
  prep: string | null;
  description: string;
  notes: string | null;
  url: string;
  component: string;
  mode: string;
};

export type CourseGroup = {
  key: string;
  courseNumber: string;
  title: string;
  term: string;
  area: string | null;
  description: string;
  sections: Section[];
};

export const SECTIONS = raw as Section[];
export const SECTION_BY_ID = new Map(SECTIONS.map((s) => [s.id, s]));

export const TERMS = ["2026 Fall", "2027 Spring"] as const;
export type Term = (typeof TERMS)[number];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const ACADEMIC_AREAS = Array.from(
  new Set(SECTIONS.map((s) => s.area).filter((a): a is string => !!a)),
).sort();

/** Sessions shown as schedule tabs, in order, for each term. */
export function sessionsForTerm(term: string): string[] {
  return term.includes("Fall")
    ? ["Full Term", "Fall 1", "Fall 2"]
    : ["Full Term", "Spring 1", "Spring 2", "January"];
}

export function isTBA(s: Pick<Section, "days" | "start" | "end">): boolean {
  return s.days.length === 0 || !s.start || !s.end;
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatTime(t: string | null): string {
  if (!t) return "";
  const mins = toMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function meetingLabel(s: Section): string {
  if (isTBA(s)) return "Time TBA";
  const days = [...s.days].sort((a, b) => ALL_DAYS.indexOf(a as never) - ALL_DAYS.indexOf(b as never));
  return `${days.join("/")} ${formatTime(s.start)}–${formatTime(s.end)}`;
}

export function needsConsent(s: Section): boolean {
  return !!s.consent && s.consent !== "No Consent";
}

export const DAY_PARTS = [
  { id: "morning", label: "Morning", hint: "before 12pm", from: 0, to: 12 * 60 },
  { id: "afternoon", label: "Afternoon", hint: "12–5pm", from: 12 * 60, to: 17 * 60 },
  { id: "evening", label: "Evening", hint: "after 5pm", from: 17 * 60, to: 24 * 60 },
] as const;

/** A blocked slot is "Day:part", e.g. "Mon:morning". */
export function slotKey(day: string, part: string): string {
  return `${day}:${part}`;
}

/**
 * True when the section meets during any blocked slot.
 * TBA sections have no known time, so they are never hidden.
 */
export function hitsBlockedSlot(s: Section, blocked: readonly string[]): boolean {
  if (isTBA(s) || blocked.length === 0) return false;
  const start = toMinutes(s.start!);
  const end = toMinutes(s.end!);
  return s.days.some((day) =>
    DAY_PARTS.some(
      (part) => blocked.includes(slotKey(day, part.id)) && start < part.to && end > part.from,
    ),
  );
}

/** Whether a section shows on a given session tab of the schedule. */
export function showsOnTab(s: Section, tab: string): boolean {
  if (s.session === tab) return true;
  // Full-term courses also run during the half-term sessions.
  return s.session === "Full Term" && /^(Fall|Spring) [12]$/.test(tab);
}

export function sectionsOverlap(a: Section, b: Section): boolean {
  if (isTBA(a) || isTBA(b)) return false;
  if (!a.days.some((d) => b.days.includes(d))) return false;
  return toMinutes(a.start!) < toMinutes(b.end!) && toMinutes(b.start!) < toMinutes(a.end!);
}

/** IDs of sections that clash with at least one other section in the list. */
export function findClashes(list: Section[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]!;
      const b = list[j]!;
      if (sectionsOverlap(a, b)) {
        out.add(a.id);
        out.add(b.id);
      }
    }
  }
  return out;
}

/** Pairs of clashing sections (for readable warnings). */
export function clashPairs(list: Section[]): [Section, Section][] {
  const pairs: [Section, Section][] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (sectionsOverlap(list[i]!, list[j]!)) pairs.push([list[i]!, list[j]!]);
    }
  }
  return pairs;
}

export function creditsBySession(list: Section[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of list) out[s.session] = (out[s.session] ?? 0) + s.credits;
  return out;
}

/** Required MPP core courses, pinned at the top of matches. */
export const CORE_COURSES = ["API-101", "API-102", "API-201", "API-202M", "API-500M", "API-501", "DPI-386M", "MLD-220M"];

/** Some courses list each section as its own number (DPI-386MA, DPI-386MB...). Treat them as one course. */
export function canonicalNumber(courseNumber: string): string {
  return courseNumber.replace(/^(DPI-386M)[A-Z]$/, "$1");
}

export function isCore(s: Pick<Section, "courseNumber">): boolean {
  return CORE_COURSES.includes(canonicalNumber(s.courseNumber));
}

export function groupKey(s: Pick<Section, "courseNumber" | "term">): string {
  return `${canonicalNumber(s.courseNumber)}|${s.term}`;
}

/** Collapse sections into one entry per course (course number + term). */
export function groupSections(list: Section[]): CourseGroup[] {
  const map = new Map<string, CourseGroup>();
  for (const s of list) {
    const key = groupKey(s);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        courseNumber: canonicalNumber(s.courseNumber),
        title: s.title,
        term: s.term,
        area: s.area,
        description: s.description,
        sections: [],
      };
      map.set(key, g);
    }
    g.sections.push(s);
  }
  for (const g of map.values()) {
    g.sections.sort((a, b) => a.section.localeCompare(b.section) || a.session.localeCompare(b.session));
  }
  return [...map.values()];
}
