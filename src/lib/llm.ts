/**
 * Server-only helper for structured (JSON) AI replies.
 *
 * Provider order:
 *   1. Google Gemini, when the GEMINI_API_KEY secret is set (optional GEMINI_MODEL overrides the model).
 *   2. Lovable's AI gateway (uses LOVABLE_API_KEY, managed by Lovable).
 * If every provider fails, it throws and the caller shows its non-AI fallback.
 *
 * Keys are read from the server environment only; nothing here runs in the browser.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type JsonRequest = {
  instructions: string;
  messages: ChatMessage[];
  /** Name for the output format (used by the Lovable gateway). */
  schemaName: string;
  /** JSON Schema describing the reply object. */
  schema: Record<string, unknown>;
};

export const DEFAULT_GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 25_000;

function readEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name]?.trim() || undefined;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);
}

/** Pulls a JSON object out of model text, tolerating ```json fences or stray prose. */
export function extractJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model reply was not JSON");
  }
}

async function callGemini(apiKey: string, model: string, req: JsonRequest): Promise<string> {
  const res = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `${req.instructions}\n\nOUTPUT FORMAT\nReply with only one JSON object (no markdown) that matches this JSON Schema:\n${JSON.stringify(req.schema)}`,
          },
        ],
      },
      contents: req.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text) throw new Error("Empty reply");
  return text;
}

async function callLovable(req: JsonRequest): Promise<string> {
  const { generateResponse } = await import("@lovable.dev/ai-gateway");
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    reasoning: { effort: "low" },
    instructions: req.instructions,
    input: req.messages.map((m) => ({ role: m.role, content: m.content })),
    text: {
      format: { type: "json_schema", name: req.schemaName, strict: true, schema: req.schema },
    },
  });
  let text = "";
  for (const item of res.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content) {
      if (c.type === "output_text") text += c.text;
    }
  }
  if (!text) throw new Error("Empty reply");
  return text;
}

/**
 * Asks the first working provider for a JSON reply and validates it with `parse`.
 * A provider whose reply fails validation counts as failed, so the next one is tried.
 */
export async function generateJson<T>(req: JsonRequest, parse: (value: unknown) => T): Promise<T> {
  const failures: string[] = [];

  const geminiKey = readEnv("GEMINI_API_KEY");
  if (geminiKey) {
    const override = readEnv("GEMINI_MODEL");
    for (const model of override ? [override] : DEFAULT_GEMINI_MODELS) {
      try {
        return parse(extractJson(await callGemini(geminiKey, model, req)));
      } catch (e) {
        failures.push(`gemini/${model}: ${errorText(e)}`);
      }
    }
  }

  try {
    return parse(extractJson(await callLovable(req)));
  } catch (e) {
    failures.push(`lovable: ${errorText(e)}`);
  }

  console.error(`[ai] all providers failed — ${failures.join(" | ")}`);
  throw new Error("AI unavailable");
}
