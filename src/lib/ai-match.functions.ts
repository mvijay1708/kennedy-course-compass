import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SECTIONS, groupSections } from "./courses";

const InputSchema = z.object({
  term: z.string().max(40),
  goals: z.string().max(2000),
  skills: z.string().max(1000),
  chips: z.array(z.string().max(60)).max(30),
  areas: z.array(z.string().max(100)).max(10),
  /** Course keys (number|term) the student is eligible for, already filtered by availability and filters. */
  candidateKeys: z.array(z.string().max(60)).max(250),
});

export type AiPick = { key: string; reason: string };

const OutputSchema = z.object({
  picks: z.array(z.object({ key: z.string(), reason: z.string() })),
});

/** Uses AI to pick the 15 best-fitting courses from the candidates and explain each in one line. */
export const getAiMatches = createServerFn({ method: "POST" })
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ picks: AiPick[] }> => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");

    const wanted = new Set(data.candidateKeys);
    const groups = groupSections(SECTIONS.filter((s) => s.term === data.term)).filter((g) => wanted.has(g.key));
    if (groups.length === 0) return { picks: [] };

    const catalog = groups
      .map((g) => `[${g.key}] ${g.courseNumber}: ${g.title} | Area: ${g.area ?? "n/a"} | ${g.description.slice(0, 320)}`)
      .join("\n");

    const profile = [
      `Career goals: ${data.goals || "(not given)"}`,
      `Skills to build: ${[...data.chips, data.skills].filter(Boolean).join(", ") || "(not given)"}`,
      `Academic areas of interest (boost, don't exclude others): ${data.areas.join(", ") || "(none)"}`,
    ].join("\n");

    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      reasoning: { effort: "low" },
      instructions:
        "You advise Harvard Kennedy School MPP students on electives. Pick the courses that best fit the student's goals and skills, judging by each course's title, description and academic area. Courses in the student's chosen areas should get a modest boost. Write one short, specific reason per course (max 20 words), addressed to the student as 'you', naming the concrete skill or topic that connects to their goals. Never invent facts beyond the course description. Only use keys from the list.",
      input: [
        {
          role: "user",
          content: `STUDENT PROFILE\n${profile}\n\nCOURSES\n${catalog}\n\nReturn up to 15 picks, best first.`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "course_picks",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["picks"],
            properties: {
              picks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "reason"],
                  properties: { key: { type: "string" }, reason: { type: "string" } },
                },
              },
            },
          },
        },
      },
    });

    let text = "";
    for (const item of res.output ?? []) {
      if (item.type !== "message") continue;
      for (const c of item.content) {
        if (c.type === "output_text") text += c.text;
      }
    }
    const parsed = OutputSchema.parse(JSON.parse(text));
    const seen = new Set<string>();
    const picks = parsed.picks.filter((p) => {
      if (!wanted.has(p.key) || seen.has(p.key)) return false;
      seen.add(p.key);
      return true;
    });
    return { picks: picks.slice(0, 15).map((p) => ({ key: p.key, reason: p.reason.trim() })) };
  });
