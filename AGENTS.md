<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Course data lives in `src/data/courses.json`, generated once from the uploaded CSV; the app has no backend database, so the catalog ships with the bundle.
- Student profile and plan persist in localStorage via `src/lib/planner-store.tsx` (no login); read storage only in effects to avoid hydration mismatches.
- Planner rules (blocked slots, clashes, credit totals, core pinning, grouping) are pure functions in `src/lib/courses.ts` and `src/lib/matching.ts`, covered by `src/lib/planner.test.ts`.
- AI match picks run in the `getAiMatches` server function; the browser only sends eligible course keys, and keyword ranking is the instant fallback while AI loads or if it fails.
- AI calls go through `generateJson` in `src/lib/llm.ts` (server only): Google Gemini first when the `GEMINI_API_KEY` secret is set (optional `GEMINI_MODEL`), then Lovable's AI gateway. If both fail, the advisor answers from catalog search alone (`fallbackReply` in `src/lib/advisor.ts`).
