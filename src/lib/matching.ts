import type { CourseGroup, Section } from "./courses";
import { groupSections, hitsBlockedSlot, isCore, needsConsent } from "./courses";

export type Profile = {
  term: string;
  goals: string;
  skills: string;
  chips: string[];
  areas: string[];
  targetCredits: number;
  /** Blocked slots like "Mon:morning". */
  unavailable: string[];
};

export const SKILL_CHIPS: Record<string, string[]> = {
  "Data analysis": ["data", "statistics", "statistical", "quantitative", "empirical", "regression", "econometrics", "analytics", "evidence", "causal", "evaluation", "programming", "machine learning"],
  Economics: ["economics", "economic", "markets", "microeconomic", "macroeconomic", "fiscal", "monetary", "trade", "finance", "incentives"],
  Development: ["development", "developing", "poverty", "inequality", "growth", "aid", "emerging"],
  Negotiation: ["negotiation", "negotiating", "bargaining", "conflict", "mediation", "dispute"],
  Leadership: ["leadership", "leading", "leader", "adaptive", "authority", "organizing", "change"],
  Writing: ["writing", "communication", "memo", "persuasion", "storytelling", "rhetoric", "op-ed"],
  Consulting: ["consulting", "client", "strategy", "strategic", "advisory", "management", "implementation"],
  "Public finance": ["budget", "budgeting", "tax", "taxation", "fiscal", "public finance", "debt"],
  "Tech policy": ["technology", "digital", "artificial intelligence", "cyber", "innovation", "data privacy"],
  "Climate & energy": ["climate", "energy", "environmental", "environment", "sustainability", "carbon"],
  "Security & foreign policy": ["security", "foreign policy", "diplomacy", "military", "defense", "war", "nuclear"],
  "Public speaking": ["speaking", "speech", "public narrative", "persuasion", "presentation", "communication"],
};

const STOP = new Set(
  "the and for with that this from into about over under want would like learn build skills skill career work working more also their they them have want get make able become better use using policy public course courses role job jobs some other very really interested interest".split(
    " ",
  ),
);

export function stem(word: string): string {
  const w = word.toLowerCase();
  for (const suf of ["ations", "ation", "ings", "ing", "ies", "ers", "es", "ed", "er", "al", "ly", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).filter((w) => w.length >= 3 && !STOP.has(w));
}

type Term = { label: string; source: string; stems: string[]; phrase: string | null };

/** Build the list of search terms from a profile. Label = what the student said. */
export function profileTerms(p: Profile): Term[] {
  const terms = new Map<string, Term>();
  const add = (word: string, label: string) => {
    const isPhrase = word.includes(" ");
    const key = isPhrase ? word : stem(word);
    if (terms.has(key)) return;
    terms.set(key, {
      label,
      source: word,
      stems: isPhrase ? [] : [stem(word)],
      phrase: isPhrase ? word.toLowerCase() : null,
    });
  };
  for (const chip of p.chips) {
    for (const kw of SKILL_CHIPS[chip] ?? []) add(kw, chip.toLowerCase());
  }
  for (const w of tokenize(`${p.goals} ${p.skills}`)) add(w, w);
  return [...terms.values()];
}

type Indexed = { group: CourseGroup; titleStems: Set<string>; descStems: Set<string>; text: string; titleText: string };

function indexGroup(g: CourseGroup): Indexed {
  return {
    group: g,
    titleStems: new Set(tokenize(g.title).map(stem)),
    descStems: new Set(tokenize(g.description).map(stem)),
    text: g.description.toLowerCase(),
    titleText: g.title.toLowerCase(),
  };
}

export type Match = {
  group: CourseGroup;
  score: number;
  reason: string;
};

export type MatchFilters = {
  session: string; // "all" or session name
  credits: string; // "all" or number as string
  area: string; // "all" or area
  noConsent: boolean;
};

export const DEFAULT_FILTERS: MatchFilters = { session: "all", credits: "all", area: "all", noConsent: false };

/** Sections the student could take given term, unavailable days and filters. */
export function eligibleSections(all: Section[], p: Profile, f: MatchFilters): Section[] {
  return all.filter(
    (s) =>
      s.term === p.term &&
      !hitsBlockedSlot(s, p.unavailable) &&
      (f.session === "all" || s.session === f.session) &&
      (f.credits === "all" || String(s.credits) === f.credits) &&
      (f.area === "all" || s.area === f.area) &&
      (!f.noConsent || !needsConsent(s)),
  );
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Required core courses that fit the term, unavailable times and filters. Pinned above ranked matches. */
export function coreMatches(all: Section[], p: Profile, f: MatchFilters): Match[] {
  return groupSections(eligibleSections(all, p, f).filter(isCore))
    .sort((a, b) => a.courseNumber.localeCompare(b.courseNumber))
    .map((group) => ({ group, score: 0, reason: "Required MPP core course." }));
}

/** Top elective matches by profile fit. Core courses are excluded (they're pinned separately). */
export function rankCourses(all: Section[], p: Profile, f: MatchFilters, limit = 15): Match[] {
  const groups = groupSections(eligibleSections(all, p, f).filter((s) => !isCore(s)));
  const indexed = groups.map(indexGroup);
  const terms = profileTerms(p);
  const n = Math.max(indexed.length, 1);

  const hit = (ix: Indexed, t: Term, where: "title" | "desc") => {
    if (t.phrase) return (where === "title" ? ix.titleText : ix.text).includes(t.phrase);
    const set = where === "title" ? ix.titleStems : ix.descStems;
    return t.stems.some((s) => set.has(s));
  };

  const idf = new Map<Term, number>();
  for (const t of terms) {
    const df = indexed.filter((ix) => hit(ix, t, "title") || hit(ix, t, "desc")).length;
    idf.set(t, Math.log((n + 1) / (df + 1)) + 0.5);
  }

  const results: Match[] = [];
  for (const ix of indexed) {
    let score = 0;
    const titleLabels = new Set<string>();
    const descLabels = new Set<string>();
    for (const t of terms) {
      const w = idf.get(t) ?? 1;
      if (hit(ix, t, "title")) {
        score += 3 * w;
        titleLabels.add(t.label);
      } else if (hit(ix, t, "desc")) {
        score += w;
        descLabels.add(t.label);
      }
    }
    const inArea = !!ix.group.area && p.areas.includes(ix.group.area);
    if (inArea) score += 2.5;
    if (score <= 0) continue;

    for (const l of titleLabels) descLabels.delete(l);
    const parts: string[] = [];
    const top = [...titleLabels, ...descLabels].slice(0, 3);
    if (top.length) {
      parts.push(
        titleLabels.size
          ? `Centered on ${listJoin(top)}`
          : `Covers ${listJoin(top)}`,
      );
    }
    if (inArea) parts.push(parts.length ? `in ${ix.group.area}, one of your areas` : `In ${ix.group.area}, one of your areas`);
    results.push({ group: ix.group, score, reason: `${parts.join(", ")}.` });
  }

  results.sort((a, b) => b.score - a.score || a.group.courseNumber.localeCompare(b.group.courseNumber));
  return results.slice(0, limit);
}
