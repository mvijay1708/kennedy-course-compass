import { Check, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionPicker } from "@/components/SectionPicker";
import { Button } from "@/components/ui/button";
import { meetingLabel, needsConsent, type CourseGroup } from "@/lib/courses";
import { usePlanner } from "@/lib/planner-store";

export function CourseCard({
  group,
  rank,
  reason,
  pinned = false,
}: {
  group: CourseGroup;
  rank?: number;
  reason?: string;
  pinned?: boolean;
}) {
  const { inPlan, addSection, removeSection, planSectionForCourse } = usePlanner();
  const planned = planSectionForCourse(group.key);
  const [selectedId, setSelectedId] = useState<string>(
    planned && group.sections.some((s) => s.id === planned.id) ? planned.id : group.sections[0]!.id,
  );
  const [open, setOpen] = useState(false);
  const selected = group.sections.find((s) => s.id === selectedId) ?? group.sections[0]!;
  const added = inPlan(selected.id);

  const handleAdd = () => {
    addSection(selected.id);
    toast.success(
      planned && planned.id !== selected.id
        ? `Switched ${group.courseNumber} to section ${selected.section}`
        : `${group.courseNumber} added to your plan`,
    );
  };

  return (
    <article className={`rounded-xl border bg-card p-5 shadow-card ${pinned ? "border-primary/40" : "border-border"}`}>
      <div className="flex gap-4">
        {rank !== undefined && (
          <div className="font-display text-2xl font-semibold leading-none text-primary/70 tabular-nums">{rank}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-primary">{group.courseNumber}</span>
            {pinned && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">Core</span>}
            <h3 className="text-lg font-semibold leading-snug">{group.title}</h3>
          </div>
          {reason && <p className="mt-1 text-sm text-foreground/80">{reason}</p>}

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-md bg-secondary px-2 py-0.5">{selected.credits} credits</span>
            <span className="rounded-md bg-secondary px-2 py-0.5">{selected.session}</span>
            {group.area && <span className="rounded-md bg-secondary px-2 py-0.5">{group.area}</span>}
            {needsConsent(selected) ? (
              <span className="rounded-md bg-warning px-2 py-0.5 text-warning-foreground">{selected.consent} consent</span>
            ) : (
              <span className="rounded-md bg-success px-2 py-0.5 text-success-foreground">No consent needed</span>
            )}
          </div>

          <div className="mt-3">
            {group.sections.length > 1 ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{group.sections.length} sections available</span>
                <SectionPicker sections={group.sections} value={selected.id} onChange={setSelectedId} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {meetingLabel(selected)} · {selected.instructors || "Staff"}
              </p>
            )}
          </div>

          {(!pinned || open) && (
            <p className={`mt-3 text-sm text-muted-foreground ${open ? "" : "line-clamp-2"}`}>{group.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {added ? (
              <Button variant="secondary" size="sm" onClick={() => removeSection(selected.id)}>
                <Check /> In your plan · Remove
              </Button>
            ) : (
              <Button size="sm" onClick={handleAdd}>
                <Plus /> {planned ? `Switch to section ${selected.section}` : "Add to plan"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Less" : "More"}
            </Button>
            <Button variant="link" size="sm" asChild>
              <a href={selected.url} target="_blank" rel="noreferrer">
                my.harvard <ExternalLink />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
