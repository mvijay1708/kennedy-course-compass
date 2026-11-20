import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BookOpen, ExternalLink, Printer, X } from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  TERMS,
  clashPairs,
  creditsBySession,
  meetingLabel,
  needsConsent,
  sessionsForTerm,
  showsOnTab,
  type Section,
} from "@/lib/courses";
import { usePlanner } from "@/lib/planner-store";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "My plan · HKS Course Planner" },
      { name: "description", content: "A summary of your chosen HKS courses with credits, sessions, prep warnings and my.harvard links." },
      { property: "og:title", content: "My plan · HKS Course Planner" },
      { property: "og:description", content: "Your chosen Harvard Kennedy School courses at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlanPage,
});

function termClashes(list: Section[], term: string) {
  const seen = new Set<string>();
  const out: [Section, Section][] = [];
  for (const tab of sessionsForTerm(term)) {
    for (const [a, b] of clashPairs(list.filter((s) => showsOnTab(s, tab)))) {
      const k = [a.id, b.id].sort().join("~");
      if (!seen.has(k)) {
        seen.add(k);
        out.push([a, b]);
      }
    }
  }
  return out;
}

function TermPlan({ term, list, target }: { term: string; list: Section[]; target: number }) {
  const { removeSection } = usePlanner();
  const credits = creditsBySession(list);
  const total = list.reduce((n, s) => n + s.credits, 0);
  const clashes = termClashes(list, term);
  const prep = list.filter((s) => s.prep);
  const sessionOrder = sessionsForTerm(term);
  const sorted = [...list].sort(
    (a, b) => sessionOrder.indexOf(a.session) - sessionOrder.indexOf(b.session) || a.courseNumber.localeCompare(b.courseNumber),
  );

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold">{term}</h2>
        <div className="text-sm text-muted-foreground">
          <span className={total < target ? "text-warning-foreground" : "text-success-foreground"}>
            {total} of {target} target credits
          </span>
          {sessionOrder
            .filter((s) => credits[s])
            .map((s) => (
              <span key={s}> · {s}: {credits[s]}</span>
            ))}
        </div>
      </div>

      {clashes.length > 0 && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-clash p-4 text-sm text-clash-foreground">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" /> Time clashes
          </div>
          <ul className="mt-1 list-disc pl-6">
            {clashes.map(([a, b]) => (
              <li key={a.id + b.id}>
                {a.courseNumber} and {b.courseNumber} overlap ({meetingLabel(a)} / {meetingLabel(b)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Course</th>
              <th className="px-4 py-2 font-medium">Session</th>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 text-right font-medium">Credits</th>
              <th className="px-4 py-2 font-medium">Links</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="px-4 py-3">
                  <div>
                    <span className="font-semibold text-primary">{s.courseNumber}</span> {s.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Section {s.section} · {s.instructors || "Staff"}
                    {needsConsent(s) && <span className="text-warning-foreground"> · {s.consent} consent required</span>}
                  </div>
                  {s.prep && (
                    <div className="mt-2 flex gap-2 rounded-md bg-warning px-2.5 py-1.5 text-xs text-warning-foreground">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        <strong>Recommended prep:</strong> {s.prep}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{s.session}</td>
                <td className="px-4 py-3 whitespace-nowrap">{meetingLabel(s)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.credits}</td>
                <td className="px-4 py-3">
                  <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    my.harvard <ExternalLink className="size-3.5" />
                  </a>
                </td>
                <td className="px-2 py-2 print:hidden">
                  <Button variant="ghost" size="icon" aria-label={`Remove ${s.courseNumber}`} onClick={() => removeSection(s.id)}>
                    <X />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border">
            <tr>
              <td className="px-4 py-2 font-medium" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">{total}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      {prep.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {prep.length} {prep.length === 1 ? "course lists" : "courses list"} recommended preparation. Check you meet it before enrolling.
        </p>
      )}
    </section>
  );
}

function PlanPage() {
  const { plan, profile, ready } = usePlanner();
  const terms = [profile.term, ...TERMS.filter((t) => t !== profile.term)];
  const byTerm = terms.map((t) => ({ term: t, list: plan.filter((s) => s.term === t) })).filter((x) => x.list.length > 0);

  return (
    <div>
      <PageHeader title="My plan" subtitle="Everything you've picked, with credits, sessions and anything to check before you enroll.">
        {byTerm.length > 0 && (
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer /> Print
          </Button>
        )}
      </PageHeader>
      {!ready ? null : byTerm.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-lg font-medium">No courses yet</p>
          <p className="mt-1 text-muted-foreground">Add courses from your matches or the schedule builder.</p>
          <Button asChild className="mt-4">
            <Link to="/matches">See my matches</Link>
          </Button>
        </div>
      ) : (
        byTerm.map((x) => <TermPlan key={x.term} term={x.term} list={x.list} target={profile.targetCredits} />)
      )}
    </div>
  );
}
