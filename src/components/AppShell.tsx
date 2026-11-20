import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { usePlanner } from "@/lib/planner-store";

const NAV = [
  { to: "/", label: "Profile", step: "1" },
  { to: "/matches", label: "My matches", step: "2" },
  { to: "/schedule", label: "Schedule", step: "3" },
  { to: "/plan", label: "My plan", step: "4" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { plan, profile, ready } = usePlanner();
  const count = plan.filter((s) => s.term === profile.term).length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold text-primary">HKS Course Planner</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">for MPP students</span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-primary-soft data-[status=active]:font-medium data-[status=active]:text-primary"
              >
                <span className="hidden text-xs opacity-60 sm:inline">{item.step}</span>
                {item.label}
                {item.to === "/plan" && ready && count > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">{count}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        Your profile and plan are saved in this browser only. Always confirm details on my.harvard before enrolling.
      </footer>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
