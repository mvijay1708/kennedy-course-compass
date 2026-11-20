import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { readAiCache, writeAiCache } from "@/lib/ai-cache";
import { getAiMatches } from "@/lib/ai-match.functions";
import { ACADEMIC_AREAS, SECTIONS, groupSections, isCore, sessionsForTerm } from "@/lib/courses";
import {
  DEFAULT_FILTERS,
  coreMatches,
  eligibleSections,
  profileTerms,
  rankCourses,
  type Match,
  type MatchFilters,
} from "@/lib/matching";
import { usePlanner } from "@/lib/planner-store";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "My matches · HKS Course Planner" },
      { name: "description", content: "Your top 15 Harvard Kennedy School courses ranked by fit with your goals and skills." },
      { property: "og:title", content: "My matches · HKS Course Planner" },
      { property: "og:description", content: "The 15 HKS courses that best match your goals, with a reason for each." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MatchesPage,
});

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MatchesPage() {
  const { profile, ready } = usePlanner();
  const [filters, setFilters] = useState<MatchFilters>(DEFAULT_FILTERS);
  const set = (patch: Partial<MatchFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const hasProfile = profileTerms(profile).length > 0 || profile.areas.length > 0;
  const keywordMatches = useMemo(() => rankCourses(SECTIONS, profile, filters, 15), [profile, filters]);
  const core = useMemo(() => coreMatches(SECTIONS, profile, filters), [profile, filters]);
  const candidates = useMemo(
    () => groupSections(eligibleSections(SECTIONS, profile, filters).filter((s) => !isCore(s))),
    [profile, filters],
  );

  const fetchAi = useServerFn(getAiMatches);
  const aiInput = {
    term: profile.term,
    goals: profile.goals.trim(),
    skills: profile.skills.trim(),
    chips: [...profile.chips].sort(),
    areas: [...profile.areas].sort(),
    candidateKeys: candidates.map((g) => g.key).sort(),
  };
  const cacheKey = JSON.stringify(aiInput);
  const ai = useQuery({
    queryKey: ["ai-matches", cacheKey],
    enabled: ready && hasProfile && candidates.length > 0,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: false,
    queryFn: async () => {
      const cached = readAiCache(cacheKey);
      if (cached) return cached;
      const res = await fetchAi({ data: aiInput });
      writeAiCache(cacheKey, res.picks);
      return res.picks;
    },
  });

  const byKey = useMemo(() => new Map(candidates.map((g) => [g.key, g])), [candidates]);
  const aiMatches: Match[] | null = ai.data
    ? ai.data.flatMap((p) => {
        const group = byKey.get(p.key);
        return group ? [{ group, score: 0, reason: p.reason }] : [];
      })
    : null;
  const usingAi = !!aiMatches && aiMatches.length > 0;
  const matches = usingAi ? aiMatches : keywordMatches;
  const filtersOn = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div>
      <PageHeader
        title="My matches"
        subtitle={`Top courses for ${profile.term}, ranked by how well they fit your goals, skills and areas.${
          profile.unavailable.length ? " Courses that meet during your unavailable times are hidden." : ""
        }`}
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted p-4">
        <FilterSelect
          label="Session"
          value={filters.session}
          onChange={(v) => set({ session: v })}
          options={[{ value: "all", label: "All sessions" }, ...sessionsForTerm(profile.term).map((s) => ({ value: s, label: s }))]}
        />
        <FilterSelect
          label="Credits"
          value={filters.credits}
          onChange={(v) => set({ credits: v })}
          options={[
            { value: "all", label: "Any credits" },
            { value: "4", label: "4 credits" },
            { value: "2", label: "2 credits" },
            { value: "1", label: "1 credit" },
            { value: "0", label: "0 credits" },
          ]}
        />
        <FilterSelect
          label="Academic area"
          value={filters.area}
          onChange={(v) => set({ area: v })}
          options={[{ value: "all", label: "All areas" }, ...ACADEMIC_AREAS.map((a) => ({ value: a, label: a }))]}
        />
        <div className="flex h-9 items-center gap-2 px-1">
          <Switch id="noconsent" checked={filters.noConsent} onCheckedChange={(v) => set({ noConsent: v })} />
          <Label htmlFor="noconsent" className="text-sm">
            No consent required
          </Label>
        </div>
        {filtersOn && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Reset
          </Button>
        )}
      </div>

      {ready && core.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-2xl font-semibold">Required MPP core</h2>
          <p className="mb-3 text-sm text-muted-foreground">Pinned for every MPP student, whatever your profile says.</p>
          <div className="flex flex-col gap-4">
            {core.map((m) => (
              <CourseCard key={m.group.key} group={m.group} reason={m.reason} pinned />
            ))}
          </div>
        </section>
      )}

      {ready && hasProfile && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Top matches for you</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            {ai.isFetching ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Picking your best fits with AI… showing quick matches meanwhile
              </>
            ) : usingAi ? (
              <>
                <Sparkles className="size-4 text-primary" /> Picked and explained by AI
              </>
            ) : ai.isError ? (
              <>
                AI picks aren't available right now, so these are quick keyword matches.
                <Button variant="link" size="sm" className="h-auto p-0" onClick={() => ai.refetch()}>
                  Try again
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {!ready ? null : !hasProfile ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-medium">Tell us a bit about yourself first</p>
          <p className="mt-1 text-muted-foreground">Add career goals, skills or areas so we can rank courses for you.</p>
          <Button asChild className="mt-4">
            <Link to="/">Go to profile</Link>
          </Button>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-lg font-medium">No matching courses</p>
          <p className="mt-1 text-muted-foreground">Try loosening the filters, adding more skills, or freeing up some times.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((m, i) => (
            <CourseCard key={m.group.key} group={m.group} rank={i + 1} reason={m.reason} />
          ))}
        </div>
      )}
    </div>
  );
}
