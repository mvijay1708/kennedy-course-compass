import { describe, expect, it } from "vitest";

import {
  SECTIONS,
  creditsBySession,
  findClashes,
  groupSections,
  hitsBlockedSlot,
  isTBA,
  showsOnTab,
  type Section,
} from "./courses";
import { DEFAULT_FILTERS, coreMatches, rankCourses, type Profile } from "./matching";
import { DEFAULT_PROFILE } from "./planner-store";

function section(over: Partial<Section>): Section {
  return {
    id: Math.random().toString(),
    courseNumber: "TST-100",
    title: "Test",
    instructors: "",
    term: "2026 Fall",
    session: "Full Term",
    section: "A",
    dates: "",
    days: ["Mon", "Wed"],
    start: "10:30",
    end: "11:45",
    credits: 4,
    area: null,
    consent: "No Consent",
    prep: null,
    description: "",
    notes: null,
    url: "",
    component: "",
    mode: "",
    ...over,
  };
}

const profile = (over: Partial<Profile>): Profile => ({ ...DEFAULT_PROFILE, ...over });

describe("defaults", () => {
  it("target credits start at 16 per term", () => {
    expect(DEFAULT_PROFILE.targetCredits).toBe(16);
  });
});

describe("unavailable times", () => {
  it("hides a 10:30 Mon/Wed class when Monday morning is blocked", () => {
    expect(hitsBlockedSlot(section({}), ["Mon:morning"])).toBe(true);
  });
  it("keeps it when only Monday afternoon is blocked", () => {
    expect(hitsBlockedSlot(section({}), ["Mon:afternoon"])).toBe(false);
  });
  it("a 16:30–17:45 class counts as evening too", () => {
    expect(hitsBlockedSlot(section({ start: "16:30", end: "17:45" }), ["Wed:evening"])).toBe(true);
  });
  it("never hides Time TBA courses", () => {
    expect(hitsBlockedSlot(section({ days: [], start: null, end: null }), ["Mon:morning"])).toBe(false);
  });
  it("no ranked or core match meets during a blocked slot", () => {
    const blocked = ["Mon:morning", "Mon:afternoon", "Mon:evening"];
    const p = profile({ chips: ["Economics", "Leadership"], unavailable: blocked });
    const all = [...rankCourses(SECTIONS, p, DEFAULT_FILTERS), ...coreMatches(SECTIONS, p, DEFAULT_FILTERS)];
    for (const m of all) for (const s of m.group.sections) expect(s.days).not.toContain("Mon");
  });
});

describe("matches", () => {
  it("returns at most 15 ranked courses", () => {
    const p = profile({ chips: ["Economics", "Leadership", "Data analysis"], goals: "policy analysis" });
    expect(rankCourses(SECTIONS, p, DEFAULT_FILTERS).length).toBeLessThanOrEqual(15);
  });
  it("shows a multi-section course once", () => {
    const groups = groupSections(SECTIONS.filter((s) => s.courseNumber === "API-101" && s.term === "2026 Fall"));
    expect(groups).toHaveLength(1);
    expect(groups[0]!.sections.length).toBe(4);
  });
  it("pins the required core and keeps it out of the ranked 15", () => {
    const p = profile({ chips: ["Economics"] });
    const core = coreMatches(SECTIONS, p, DEFAULT_FILTERS).map((m) => m.group.courseNumber);
    expect(core).toEqual(expect.arrayContaining(["API-101", "API-201", "API-501", "DPI-386M", "MLD-220M"]));
    const ranked = rankCourses(SECTIONS, p, DEFAULT_FILTERS).map((m) => m.group.courseNumber);
    expect(ranked).not.toContain("API-101");
  });
  it("'no consent required' filter excludes consent courses", () => {
    const p = profile({ chips: ["Negotiation", "Leadership", "Economics"] });
    const res = rankCourses(SECTIONS, p, { ...DEFAULT_FILTERS, noConsent: true });
    for (const m of res) for (const s of m.group.sections) expect(s.consent ?? "No Consent").toBe("No Consent");
  });
});

describe("schedule", () => {
  it("flags overlapping courses as clashes", () => {
    const a = section({ id: "a" });
    const b = section({ id: "b", days: ["Wed"], start: "11:00", end: "12:15" });
    const c = section({ id: "c", days: ["Tue"] });
    expect([...findClashes([a, b, c])].sort()).toEqual(["a", "b"]);
  });
  it("back-to-back classes don't clash", () => {
    const a = section({ id: "a", end: "12:00" });
    const b = section({ id: "b", start: "12:00", end: "13:15" });
    expect(findClashes([a, b]).size).toBe(0);
  });
  it("full-term courses appear on the Fall 1 and Fall 2 tabs", () => {
    const s = section({ session: "Full Term" });
    expect(showsOnTab(s, "Fall 1")).toBe(true);
    expect(showsOnTab(s, "Fall 2")).toBe(true);
    expect(showsOnTab(section({ session: "Fall 1" }), "Fall 2")).toBe(false);
  });
  it("courses with no days or times are Time TBA", () => {
    expect(isTBA(section({ days: [] }))).toBe(true);
    expect(isTBA(section({ start: null }))).toBe(true);
  });
  it("totals credits per session", () => {
    const totals = creditsBySession([
      section({ session: "Full Term", credits: 4 }),
      section({ session: "Fall 1", credits: 2 }),
      section({ session: "Fall 1", credits: 2 }),
    ]);
    expect(totals).toEqual({ "Full Term": 4, "Fall 1": 4 });
  });
});
