import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock, X } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { CourseSearch } from "@/components/CourseSearch";
import { WeekCalendar } from "@/components/WeekCalendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clashPairs,
  creditsBySession,
  findClashes,
  isTBA,
  meetingLabel,
  sessionsForTerm,
  showsOnTab,
} from "@/lib/courses";
import { usePlanner } from "@/lib/planner-store";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule builder · HKS Course Planner" },
      { name: "description", content: "See your HKS courses on a weekly calendar by session, with time clashes flagged." },
      { property: "og:title", content: "Schedule builder · HKS Course Planner" },
      { property: "og:description", content: "Build your weekly HKS schedule for each session and spot clashes instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { plan, profile, removeSection } = usePlanner();
  const sessions = sessionsForTerm(profile.term);
  const [tab, setTab] = useState(sessions[0]!);
  const activeTab = sessions.includes(tab) ? tab : sessions[0]!;

  const termPlan = plan.filter((s) => s.term === profile.term);
  const credits = creditsBySession(termPlan);
  const total = termPlan.reduce((n, s) => n + s.credits, 0);
  const tba = termPlan.filter(isTBA);

  return (
    <div>
      <PageHeader title="Schedule builder" subtitle={`Your week in ${profile.term}. Hover a course on the calendar to remove it.`}>
        <Button variant="outline" asChild>
          <Link to="/matches">Browse matches</Link>
        </Button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {sessions.map((s) => (
          <div key={s} className="rounded-xl border border-border bg-card p-3 shadow-card">
            <div className="text-xs text-muted-foreground">{s}</div>
            <div className="font-display text-2xl font-semibold">
              {credits[s] ?? 0} <span className="text-sm font-normal text-muted-foreground">credits</span>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-3">
          <div className="text-xs text-primary">Term total</div>
          <div className="font-display text-2xl font-semibold text-primary">
            {total} <span className="text-sm font-normal">/ {profile.targetCredits}</span>
          </div>
        </div>
      </div>

      <div className="mb-5">
        <CourseSearch term={profile.term} />
      </div>

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList>
          {sessions.map((s) => {
            const onTab = termPlan.filter((x) => showsOnTab(x, s));
            const hasClash = findClashes(onTab).size > 0;
            return (
              <TabsTrigger key={s} value={s} className="gap-1.5">
                {hasClash && <AlertTriangle className="size-3.5 text-destructive" />}
                {s}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {sessions.map((s) => {
          const onTab = termPlan.filter((x) => showsOnTab(x, s));
          const clashes = findClashes(onTab);
          const pairs = clashPairs(onTab);
          const listed = onTab.filter((x) => !isTBA(x));
          return (
            <TabsContent key={s} value={s} className="mt-4">
              {pairs.length > 0 && (
                <div className="mb-4 rounded-xl border border-destructive/40 bg-clash p-4 text-sm text-clash-foreground">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4" /> {pairs.length === 1 ? "1 time clash" : `${pairs.length} time clashes`}
                  </div>
                  <ul className="mt-1 list-disc pl-6">
                    {pairs.map(([a, b]) => (
                      <li key={a.id + b.id}>
                        {a.courseNumber} ({meetingLabel(a)}) overlaps {b.courseNumber} ({meetingLabel(b)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {listed.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
                  No scheduled courses in {s} yet. Search above or add from your matches.
                </div>
              ) : (
                <WeekCalendar
                  sections={listed}
                  clashes={clashes}
                  faded={(x) => x.session !== s}
                  onRemove={removeSection}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Clock className="size-5 text-muted-foreground" /> Time TBA
        </h2>
        <p className="text-sm text-muted-foreground">Courses without a set meeting time. They don't appear on the calendar.</p>
        {tba.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">None in your plan.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {tba.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-semibold text-primary">{x.courseNumber}</span> {x.title}
                  <span className="text-muted-foreground"> · {x.session} · {x.credits} cr</span>
                </span>
                <Button variant="ghost" size="icon" aria-label={`Remove ${x.courseNumber}`} onClick={() => removeSection(x.id)}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
