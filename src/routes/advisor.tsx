import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAdvisor } from "@/lib/advisor.functions";
import { SECTIONS, canonicalNumber } from "@/lib/courses";
import { usePlanner } from "@/lib/planner-store";

export const Route = createFileRoute("/advisor")({
  head: () => ({
    meta: [
      { title: "Ask the advisor · HKS Course Planner" },
      {
        name: "description",
        content:
          "Ask questions about Harvard Kennedy School courses and get answers grounded in the course catalog.",
      },
      { property: "og:title", content: "Ask the advisor · HKS Course Planner" },
      {
        property: "og:description",
        content: "An AI course advisor for HKS MPP students, grounded in the catalog.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdvisorPage,
});

type Message = { role: "user" | "assistant"; content: string; courses?: string[] };

const SUGGESTIONS = [
  "Which quantitative courses fit someone heading into consulting?",
  "Compare DEV-101 and DEV-130 for a first-year MPP.",
  "What are good Fall 2 modules for writing and communication?",
  "Which development courses don't need consent?",
];

function courseInfo(number: string, term: string) {
  const matches = SECTIONS.filter((s) => canonicalNumber(s.courseNumber) === number);
  return matches.find((s) => s.term === term) ?? matches[0];
}

function AdvisorPage() {
  const { profile } = usePlanner();
  const ask = useServerFn(askAdvisor);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    if (question.length > 800) {
      setError("Please keep your question under 800 characters.");
      return;
    }
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: question }]);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      const reply = await ask({
        data: {
          question,
          history: history.slice(-10),
          term: profile.term,
          goals: profile.goals,
          skills: profile.skills,
          chips: profile.chips,
          areas: profile.areas,
        },
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply.answer, courses: reply.courses },
      ]);
    } catch {
      setMessages((m) => m.slice(0, -1));
      setDraft(question);
      setError("The advisor isn't available right now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <div>
      <PageHeader
        title="Ask the advisor"
        subtitle={`Questions about HKS courses for ${profile.term}, answered from the course catalog and your profile. Mention "fall" or "spring" to switch terms.`}
      />

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:p-6">
        {messages.length === 0 ? (
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" /> Try one of these:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-sm hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-4" aria-live="polite">
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-3"
                  }
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed">{m.content}</p>
                  {m.courses && m.courses.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {m.courses.map((c) => {
                        const s = courseInfo(c, profile.term);
                        if (!s) return null;
                        return (
                          <a
                            key={c}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            title={s.title}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:text-primary"
                          >
                            <span className="font-semibold">{c}</span>
                            <span className="hidden max-w-48 truncate sm:inline">{s.title}</span>
                            <ExternalLink className="size-3" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {busy && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Checking the catalog…
              </li>
            )}
          </ol>
        )}
        <div ref={endRef} />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about courses, workload, timing or how a course fits your goals…"
            aria-label="Your question"
            rows={2}
            maxLength={800}
            className="min-h-11 resize-none bg-background"
          />
          <Button type="submit" disabled={busy || !draft.trim()} aria-label="Send question">
            {busy ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        The advisor only knows what's in the course catalog and can make mistakes. Confirm
        requirements with the MPP program office and details on my.harvard before enrolling.
      </p>
    </div>
  );
}
