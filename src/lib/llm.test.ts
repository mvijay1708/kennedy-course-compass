import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gateway = vi.hoisted(() => ({ generateResponse: vi.fn() }));
vi.mock("@lovable.dev/ai-gateway", () => gateway);

import { extractJson, generateJson, type JsonRequest } from "./llm";

const req: JsonRequest = {
  instructions: "Be helpful.",
  messages: [{ role: "user", content: "hi" }],
  schemaName: "x",
  schema: { type: "object" },
};
const parse = (v: unknown) => v as { answer: string };

function geminiOk(text: string) {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
  });
}
function lovableOk(text: string) {
  return { output: [{ type: "message", content: [{ type: "output_text", text }] }] };
}

describe("AI provider chain", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    gateway.generateResponse.mockReset();
  });

  it("uses Gemini when a key is set, sending the key only in a header", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    fetchMock.mockResolvedValueOnce(geminiOk('{"answer":"from gemini"}'));
    await expect(generateJson(req, parse)).resolves.toEqual({ answer: "from gemini" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain("test-key");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "test-key" });
    expect(gateway.generateResponse).not.toHaveBeenCalled();
  });

  it("tries the backup Gemini model, then Lovable, when calls fail", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    fetchMock.mockResolvedValue(new Response("quota", { status: 429 }));
    gateway.generateResponse.mockResolvedValueOnce(lovableOk('{"answer":"from lovable"}'));
    await expect(generateJson(req, parse)).resolves.toEqual({ answer: "from lovable" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips Gemini when no key is set", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    gateway.generateResponse.mockResolvedValueOnce(lovableOk('{"answer":"ok"}'));
    await expect(generateJson(req, parse)).resolves.toEqual({ answer: "ok" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when every provider fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    gateway.generateResponse.mockRejectedValueOnce(new Error("payment"));
    await expect(generateJson(req, parse)).rejects.toThrow("AI unavailable");
  });

  it("treats a reply that fails validation as a failure", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "only-model");
    fetchMock.mockResolvedValueOnce(geminiOk('{"wrong":1}'));
    gateway.generateResponse.mockResolvedValueOnce(lovableOk('{"answer":"valid"}'));
    const strict = (v: unknown) => {
      if (typeof (v as { answer?: unknown }).answer !== "string") throw new Error("bad");
      return v as { answer: string };
    };
    await expect(generateJson(req, strict)).resolves.toEqual({ answer: "valid" });
  });

  it("reads JSON wrapped in code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":2}')).toEqual({ a: 2 });
  });
});
