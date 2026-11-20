import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SectionPicker } from "@/components/SectionPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SECTIONS, groupSections, meetingLabel, type CourseGroup } from "@/lib/courses";
import { usePlanner } from "@/lib/planner-store";

function Row({ group }: { group: CourseGroup }) {
  const { addSection, planSectionForCourse } = usePlanner();
  const planned = planSectionForCourse(group.key);
  const [id, setId] = useState(planned?.id ?? group.sections[0]!.id);
  const selected = group.sections.find((s) => s.id === id) ?? group.sections[0]!;
  const isIn = planned?.id === selected.id;
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          <span className="font-semibold text-primary">{group.courseNumber}</span> {group.title}
        </div>
        {group.sections.length > 1 ? (
          <div className="mt-1">
            <SectionPicker sections={group.sections} value={selected.id} onChange={setId} />
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {selected.session} · {meetingLabel(selected)} · {selected.credits} cr
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={isIn ? "secondary" : "default"}
        disabled={isIn}
        onClick={() => {
          addSection(selected.id);
          toast.success(`${group.courseNumber} added`);
        }}
      >
        <Plus /> {isIn ? "Added" : planned ? "Switch" : "Add"}
      </Button>
    </li>
  );
}

export function CourseSearch({ term }: { term: string }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => groupSections(SECTIONS.filter((s) => s.term === term)), [term]);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return groups
      .filter((g) => `${g.courseNumber} ${g.title} ${g.sections.map((s) => s.instructors).join(" ")}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, groups]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={`Add a course for ${term}: search by number, title or instructor`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {q.trim().length >= 2 && (
        <ul className="mt-2">
          {results.length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">No courses found.</li>
          ) : (
            results.map((g) => <Row key={g.key} group={g} />)
          )}
        </ul>
      )}
    </div>
  );
}
