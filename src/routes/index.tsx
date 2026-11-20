import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACADEMIC_AREAS, DAY_PARTS, TERMS, WEEKDAYS, slotKey } from "@/lib/courses";
import { SKILL_CHIPS } from "@/lib/matching";
import { usePlanner } from "@/lib/planner-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Your profile · HKS Course Planner" },
      { name: "description", content: "Tell the planner your term, career goals, skills and availability to get HKS course matches." },
      { property: "og:title", content: "Your profile · HKS Course Planner" },
      { property: "og:description", content: "Set your goals, skills and availability to find Harvard Kennedy School courses that fit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfilePage() {
  const { profile, updateProfile, resetProfile } = usePlanner();
  const blocked = profile.unavailable;

  const toggleDay = (day: string) => {
    const keys = DAY_PARTS.map((p) => slotKey(day, p.id));
    const allOn = keys.every((k) => blocked.includes(k));
    updateProfile({
      unavailable: allOn ? blocked.filter((k) => !keys.includes(k)) : [...new Set([...blocked, ...keys])],
    });
  };

  return (
    <div>
      <PageHeader
        title="Your profile"
        subtitle="A few answers about what you want from your courses. We use them to rank courses and hide ones you can't attend."
      >
        <Button variant="ghost" size="sm" onClick={resetProfile}>
          Clear profile
        </Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Term" hint="Which semester are you planning?">
          <div className="flex flex-wrap gap-2">
            {TERMS.map((t) => (
              <button key={t} type="button" className="chip" data-on={profile.term === t} onClick={() => updateProfile({ term: t })}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Label htmlFor="credits" className="text-sm">
              Target credits this term
            </Label>
            <Input
              id="credits"
              type="number"
              min={0}
              max={40}
              className="w-20"
              value={profile.targetCredits}
              onChange={(e) => updateProfile({ targetCredits: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        </Section>

        <Section title="Career goals" hint="Where do you want to be after the MPP?">
          <Textarea
            rows={4}
            placeholder="e.g. Work on education policy at a state agency, or join a development consulting firm in East Africa."
            value={profile.goals}
            onChange={(e) => updateProfile({ goals: e.target.value })}
          />
        </Section>

        <Section title="Skills to build" hint="Pick any that apply, and add your own below.">
          <div className="flex flex-wrap gap-2">
            {Object.keys(SKILL_CHIPS).map((chip) => (
              <button
                key={chip}
                type="button"
                className="chip"
                data-on={profile.chips.includes(chip)}
                onClick={() => updateProfile({ chips: toggle(profile.chips, chip) })}
              >
                {chip}
              </button>
            ))}
          </div>
          <Input
            className="mt-4"
            placeholder="Other skills, e.g. cost-benefit analysis, GIS, coalition building"
            value={profile.skills}
            onChange={(e) => updateProfile({ skills: e.target.value })}
          />
        </Section>

        <Section title="Academic areas" hint="Courses in these areas get a boost. Others still show.">
          <div className="flex flex-wrap gap-2">
            {ACADEMIC_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                className="chip"
                data-on={profile.areas.includes(area)}
                onClick={() => updateProfile({ areas: toggle(profile.areas, area) })}
              >
                {area}
              </button>
            ))}
          </div>
        </Section>

        <div className="lg:col-span-2">
          <Section title="When you're unavailable" hint="Tap the times you can't take classes. Tap a day to block all of it. Courses meeting then are hidden from your matches.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-separate border-spacing-1.5 text-sm">
                <thead>
                  <tr>
                    <th />
                    {DAY_PARTS.map((p) => (
                      <th key={p.id} className="text-left font-medium">
                        {p.label} <span className="font-normal text-muted-foreground">{p.hint}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKDAYS.map((day) => (
                    <tr key={day}>
                      <th className="w-16 text-left">
                        <button type="button" onClick={() => toggleDay(day)} className="font-medium hover:text-primary" aria-label={`Block all of ${day}`}>
                          {day}
                        </button>
                      </th>
                      {DAY_PARTS.map((p) => {
                        const key = slotKey(day, p.id);
                        const on = blocked.includes(key);
                        return (
                          <td key={key}>
                            <button
                              type="button"
                              aria-pressed={on}
                              aria-label={`${day} ${p.label} ${on ? "unavailable" : "available"}`}
                              onClick={() => updateProfile({ unavailable: toggle(blocked, key) })}
                              className={
                                on
                                  ? "h-10 w-full rounded-md border border-primary bg-primary text-xs font-medium text-primary-foreground"
                                  : "h-10 w-full rounded-md border border-border bg-background text-xs text-muted-foreground hover:border-primary"
                              }
                            >
                              {on ? "Unavailable" : "Free"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button asChild size="lg">
          <Link to="/matches">
            See my matches <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
