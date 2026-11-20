import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { meetingLabel, type Section } from "@/lib/courses";

export function sectionLabel(s: Section, showSession: boolean, showNumber = false): string {
  const name = showNumber ? s.courseNumber : `Section ${s.section}`;
  return `${name}${showSession ? ` · ${s.session}` : ""} · ${meetingLabel(s)} · ${s.instructors || "Staff"}`;
}

export function SectionPicker({
  sections,
  value,
  onChange,
}: {
  sections: Section[];
  value: string;
  onChange: (id: string) => void;
}) {
  const multiSession = new Set(sections.map((s) => s.session)).size > 1;
  const multiNumber = new Set(sections.map((s) => s.courseNumber)).size > 1;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full text-left text-sm sm:max-w-md" aria-label="Choose a section">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sections.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {sectionLabel(s, multiSession, multiNumber)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
