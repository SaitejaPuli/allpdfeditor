import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const RUN = "X-Lovable-AIG-Run-ID";

export async function askAi(instructions: string, messages: ModelMessage[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured yet.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const h = new Headers(init?.headers);
      if (runId) h.set(RUN, runId);
      const res = await fetch(input, { ...init, headers: h });
      runId ??= res.headers.get(RUN) ?? undefined;
      if (!res.ok) {
        if (res.status === 402) throw new Error("The free AI allowance has run out for now. Please try again later.");
        if (res.status === 429) throw new Error("Too many AI requests right now. Please wait a minute and try again.");
      }
      return res;
    },
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions,
    messages,
    onError: ({ error }) => { failure = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = await result.text;
  if (failure) { console.error(failure); throw failure instanceof Error ? failure : new Error("AI request failed."); }
  if (!text.trim()) throw new Error("The AI couldn't produce an answer for this document.");
  return text;
}
