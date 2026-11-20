import { describe, expect, it } from "vitest";

import { courseLine, mentionedCourseNumbers, retrieveCourses, termsForQuestion } from "./advisor";
import { SECTIONS } from "./courses";

describe("advisor course search", () => {
  it("reads course numbers written in different ways", () => {
    expect(mentionedCourseNumbers("Compare API-209 and dpi 851m please")).toEqual([
      "API-209",
      "DPI-851M",
    ]);
  });

  it("uses the planning term unless the question names one", () => {
    expect(termsForQuestion("good data courses?", "2026 Fall")).toEqual(["2026 Fall"]);
    expect(termsForQuestion("what about spring?", "2026 Fall")).toEqual(["2027 Spring"]);
    expect(termsForQuestion("fall or spring?", "2026 Fall")).toEqual(["2026 Fall", "2027 Spring"]);
  });

  it("always includes a course the student names", () => {
    const found = retrieveCourses(SECTIONS, "Is API-209 too hard?", "", "2026 Fall").map(
      (g) => g.courseNumber,
    );
    expect(found[0]).toBe("API-209");
  });

  it("finds relevant courses by topic", () => {
    const found = retrieveCourses(SECTIONS, "negotiation", "", "2026 Fall", 10);
    expect(found.length).toBeGreaterThan(0);
    expect(found.some((g) => /negotiat/i.test(g.title))).toBe(true);
  });

  it("returns nothing when no course matches the words", () => {
    expect(retrieveCourses(SECTIONS, "xylophone zebra quokka", "", "2026 Fall")).toEqual([]);
  });

  it("leaves out non-degree courses unless asked", () => {
    const plain = retrieveCourses(SECTIONS, "research experience", "", "2026 Fall", 50).map(
      (g) => g.courseNumber,
    );
    expect(plain).not.toContain("SMR-3");
  });

  it("writes one line per course with number, credits and times", () => {
    const g = retrieveCourses(SECTIONS, "API-209", "", "2026 Fall")[0]!;
    const line = courseLine(g);
    expect(line).toContain("API-209");
    expect(line).toContain("credits");
  });
});
