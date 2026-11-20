import { AlertTriangle, X } from "lucide-react";

import { ALL_DAYS, WEEKDAYS, formatTime, isTBA, toMinutes, type Section } from "@/lib/courses";

const START_HOUR = 8;
const END_HOUR = 21;
const PX_PER_MIN = 0.9;

type Block = { s: Section; day: string; start: number; end: number; lane: number; lanes: number };

function layoutDay(day: string, sections: Section[]): Block[] {
  const items = sections
    .filter((s) => !isTBA(s) && s.days.includes(day))
    .map((s) => ({ s, day, start: toMinutes(s.start!), end: toMinutes(s.end!), lane: 0, lanes: 1 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  // Greedy lanes within each cluster of overlapping blocks.
  let cluster: Block[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((b) => b.lane + 1));
    cluster.forEach((b) => (b.lanes = lanes));
    cluster = [];
  };
  for (const b of items) {
    if (b.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.end > b.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    b.lane = lane;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
  return items;
}

export function WeekCalendar({
  sections,
  clashes,
  faded,
  onRemove,
}: {
  sections: Section[];
  clashes: Set<string>;
  faded: (s: Section) => boolean;
  onRemove: (id: string) => void;
}) {
  const hasWeekend = sections.some((s) => s.days.some((d) => d === "Sat" || d === "Sun"));
  const days: readonly string[] = hasWeekend ? ALL_DAYS : WEEKDAYS;
  const height = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <div className="min-w-[640px]">
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => (
            <div key={d} className="py-2 text-center text-sm font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, 1fr)`, height }}>
          <div className="relative">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
                style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
              >
                {h > START_HOUR && formatTime(`${h}:00`)}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div key={day} className="relative border-l border-border">
              {hours.slice(1, -1).map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }} />
              ))}
              {layoutDay(day, sections).map((b) => {
                const clash = clashes.has(b.s.id);
                const dim = faded(b.s);
                const top = (b.start - START_HOUR * 60) * PX_PER_MIN;
                const h = (b.end - b.start) * PX_PER_MIN;
                return (
                  <div
                    key={b.s.id + day}
                    className={`group absolute overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-[11px] leading-tight ${
                      clash
                        ? "border-destructive bg-clash text-clash-foreground ring-1 ring-destructive"
                        : "border-event-border bg-event text-event-foreground"
                    } ${dim && !clash ? "opacity-55" : ""}`}
                    style={{
                      top,
                      height: h,
                      left: `calc(${(b.lane / b.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / b.lanes}% - 4px)`,
                    }}
                    title={`${b.s.courseNumber} ${b.s.title} (${b.s.session})`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold">
                        {clash && <AlertTriangle className="mr-0.5 inline size-3" />}
                        {b.s.courseNumber}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${b.s.courseNumber}`}
                        onClick={() => onRemove(b.s.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="truncate">{b.s.title}</div>
                    <div className="opacity-80">
                      {formatTime(b.s.start)}–{formatTime(b.s.end)}
                      {dim ? " · Full term" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
