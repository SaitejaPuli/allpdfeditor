import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { askAi } from "./ai.server";

const MAX = 60000;

const schema = z.object({
  mode: z.enum(["summarize", "translate", "chat"]),
  text: z.string().min(1).max(200000),
  language: z.string().max(60).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).max(30).optional(),
});

export const pdfAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const doc = data.text.slice(0, MAX);
    try {
      if (data.mode === "summarize") {
        return { text: await askAi(
          "You summarize documents clearly for everyday readers. Write a short overview paragraph, then 5-10 bullet key points, then any important dates, numbers or action items. Use plain text with '-' bullets. Reply in the document's language.",
          [{ role: "user", content: `Document:\n\n${doc}` }],
        ) };
      }
      if (data.mode === "translate") {
        return { text: await askAi(
          `Translate the document into ${data.language || "English"}. Keep paragraphs and page markers. Output only the translation as plain text.`,
          [{ role: "user", content: doc }],
        ) };
      }
      const history = data.history ?? [];
      return { text: await askAi(
        `You answer questions about the document below. Answer only from the document; if the answer isn't there, say so. Mention page numbers when useful. Keep answers concise, plain text.\n\nDOCUMENT:\n${doc}`,
        history.map((m) => ({ role: m.role, content: m.content })),
      ) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "AI request failed." };
    }
  });
