import {
  TERMS,
  groupSections,
  isNonDegree,
  meetingLabel,
  type CourseGroup,
  type Section,
} from "./courses";
import { stem, tokenize } from "./matching";

/** Course numbers written like "API-209", "API 209" or "dpi-851m". */
const COURSE_NUMBER = /\b([A-Za-z]{2,4})[\s-]?(\d{2,4}[A-Za-z]{0,2})\b/g;

export function mentionedCourseNumbers(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(COURSE_NUMBER))
    out.add(`${m[1]!.toUpperCase()}-${m[2]!.toUpperCase()}`);
  return [...out];
}

/** Which terms a question is about: explicit "fall"/"spring" wins, otherwise the student's planning term. */
export function termsForQuestion(question: string, profileTerm: string): string[] {
  const q = question.toLowerCase();
  const fall = /\bfall\b/.test(q);
  const spring = /\bspring\b|\bjanuary\b|\bj-term\b/.test(q);
  if (fall && !spring) return TERMS.filter((t) => t.includes("Fall"));
  if (spring && !fall) return TERMS.filter((t) => t.includes("Spring"));
  if (fall && spring) return [...TERMS];
  return [profileTerm];
}

/**
 * Pick the catalog entries most relevant to a question, so the AI only sees a
 * short, grounded list. Question words count more than profile words; courses
 * named by number are always included.
 */
export function retrieveCourses(
  all: Section[],
  question: string,
  profileText: string,
  profileTerm: string,
  limit = 25,
): CourseGroup[] {
  const terms = termsForQuestion(question, profileTerm);
  const named = new Set(mentionedCourseNumbers(question));
  const wantsNonDegree = /summer|reading and research|0[-\s]?credit|workshop/i.test(question);
  const groups = groupSections(
    all.filter(
      (s) =>
        terms.includes(s.term) && (wantsNonDegree || !isNonDegree(s) || named.has(s.courseNumber)),
    ),
  );

  const qStems = new Set(tokenize(question).map(stem));
  const pStems = new Set(tokenize(profileText).map(stem));

  const scored = groups.map((g) => {
    const title = new Set(tokenize(g.title).map(stem));
    const body = new Set(tokenize(`${g.description} ${g.area ?? ""}`).map(stem));
    let score = named.has(g.courseNumber) ? 1000 : 0;
    for (const s of qStems) score += title.has(s) ? 6 : body.has(s) ? 3 : 0;
    for (const s of pStems) score += title.has(s) ? 2 : body.has(s) ? 1 : 0;
    return { g, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.g.courseNumber.localeCompare(b.g.courseNumber))
    .slice(0, limit)
    .map((x) => x.g);
}

/** One compact line per course for the AI prompt. */
export function courseLine(g: CourseGroup): string {
  const first = g.sections[0]!;
  const times = [...new Set(g.sections.map((s) => `${s.session}: ${meetingLabel(s)}`))]
    .slice(0, 3)
    .join("; ");
  const parts = [
    `${g.courseNumber}: ${g.title}`,
    g.term,
    `${first.credits} credits`,
    times,
    g.area ? `Area: ${g.area}` : "",
    first.consent && first.consent !== "No Consent" ? `Consent: ${first.consent}` : "",
    first.prep ? `Recommended prep: ${first.prep.slice(0, 160)}` : "",
    first.notes ? `Notes: ${first.notes.slice(0, 200)}` : "",
    g.description.slice(0, 400),
  ];
  return parts.filter(Boolean).join(" | ");
}
