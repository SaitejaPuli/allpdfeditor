import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { SiteHeader } from "@/components/SiteHeader";
import { getTool } from "@/lib/tools";
import type { Out } from "@/lib/pdf-ops";
import { useServerFn } from "@tanstack/react-start";
import { pdfAi } from "@/lib/ai.functions";

export const Route = createFileRoute("/tool/$id")({
  staticData: { sitemap: true },
  loader: ({ params }) => {
    const tool = getTool(params.id);
    if (!tool) throw notFound();
    return { tool };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.tool;
    const title = t ? `${t.name} — allpdfeditor` : "Tool not found — allpdfeditor";
    const desc = t ? `${t.desc} Free and private, right in your browser.` : "";
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ToolPage,
});

const input = "w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function ToolPage() {
  const { tool } = Route.useLoaderData();
  const [files, setFiles] = useState<File[]>([]);
  const [outs, setOuts] = useState<Out[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [o, setO] = useState({ ranges: "1-2", every: false, deg: 90, text: "", password: "", page: 1, x: 10, y: 10, size: 16, header: "", footer: "", pos: "bottom-right", scale: 25, crop: 5, title: "", author: "", subject: "", keywords: "" });
  const [img, setImg] = useState<File | null>(null);
  const sigRef = useRef<HTMLCanvasElement>(null);
  const [x2, setX2] = useState({ lang: "Spanish", ocrLang: "eng", per: 2, after: 1, count: 1, flat: false, progress: "" });
  const [fields, setFields] = useState<{ name: string; type: string; value: string; options: string[] }[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [aiText, setAiText] = useState("");
  const [docText, setDocText] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [q, setQ] = useState("");
  const ai = useServerFn(pdfAi);
  const isAi = tool.category === "AI";

  useEffect(() => { setFiles([]); setOuts([]); setErr(""); setAiText(""); setChat([]); setDocText(""); setFields([]); }, [tool.id]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((p) => (tool.multiple ? [...p, ...arr] : arr.slice(0, 1)));
    setOuts([]); setAiText(""); setChat([]); setDocText("");
    if (tool.id === "fill-form" && arr[0]) import("@/lib/pdf-ops2").then((m) => m.readFields(arr[0]!)).then((fs) => { setFields(fs); setVals(Object.fromEntries(fs.map((x) => [x.name, x.value]))); if (!fs.length) setErr("This PDF has no fillable fields."); }).catch(() => setErr("Couldn't read this form."));
    if (tool.id === "metadata" && arr[0]) import("@/lib/pdf-ops").then((m) => m.readMetadata(arr[0]!)).then((md) => setO((p) => ({ ...p, ...md }))).catch(() => {});
  };
  const move = (i: number, d: number) =>
    setFiles((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j]!, a[i]!]; return a; });

  async function run() {
    setBusy(true); setErr(""); setOuts([]);
    try {
      const ops = await import("@/lib/pdf-ops");
      const op2 = await import("@/lib/pdf-ops2");
      const f = files[0]!;
      let r: Out[] = [];
      switch (tool.id) {
        case "merge": r = await ops.merge(files); break;
        case "split": r = await ops.split(f, o.ranges, o.every); break;
        case "remove-pages": r = await ops.removePages(f, o.ranges); break;
        case "organize": r = await ops.organize(f, o.ranges); break;
        case "compress": r = await ops.compress(f); break;
        case "rotate": r = await ops.rotate(f, o.deg); break;
        case "jpg-to-pdf": r = await ops.imagesToPdf(files); break;
        case "pdf-to-jpg": r = await ops.pdfToJpg(f); break;
        case "watermark": r = await ops.watermark(f, o.text || "CONFIDENTIAL"); break;
        case "page-numbers": r = await ops.pageNumbers(f); break;
        case "edit": if (!o.text) throw new Error("Type some text to add."); r = await ops.addText(f, o.text, o.page, o.x, o.y, o.size); break;
        case "sign": r = await ops.sign(f, sigRef.current!.toDataURL("image/png"), o.page); break;
        case "protect": if (!o.password) throw new Error("Enter a password."); r = await ops.protect(f, o.password); break;
        case "unlock": r = await ops.unlock(f, o.password); break;
        case "grayscale": r = await ops.grayscale(f); break;
        case "pdf-to-text": r = await ops.pdfToText(f); break;
        case "pdf-to-png": r = await ops.pdfToPng(f); break;
        case "add-image": if (!img) throw new Error("Choose an image to add."); r = await ops.addImage(f, img, o.page, o.pos, o.scale); break;
        case "header-footer": if (!o.header && !o.footer) throw new Error("Type a header or footer."); r = await ops.headerFooter(f, o.header, o.footer); break;
        case "metadata": r = await ops.setMetadata(f, o); break;
        case "reverse": r = await ops.reverse(f); break;
        case "crop": r = await ops.crop(f, o.crop); break;
        case "ai-summarize": case "ai-translate": case "ai-chat": {
          const text = docText || await op2.extractText(f);
          if (text.replace(/\[Page \d+\]/g, "").trim().length < 20) throw new Error("No readable text found. If this is a scanned PDF, run OCR PDF first.");
          setDocText(text);
          if (tool.id === "ai-chat") { setBusy(false); return; }
          const res = await ai({ data: { mode: tool.id === "ai-summarize" ? "summarize" : "translate", text, language: x2.lang } });
          if ("error" in res && res.error) throw new Error(res.error);
          const out = "text" in res ? res.text ?? "" : "";
          setAiText(out);
          r = [{ name: `${f.name.replace(/\.pdf$/i, "")}-${tool.id === "ai-summarize" ? "summary" : x2.lang.toLowerCase()}.txt`, blob: new Blob([out], { type: "text/plain" }) }];
          break;
        }
        case "word-to-pdf": r = await op2.wordToPdf(f); break;
        case "excel-to-pdf": r = await op2.excelToPdf(f); break;
        case "html-to-pdf": r = await op2.htmlToPdf(f); break;
        case "text-to-pdf": r = await op2.textToPdf(f); break;
        case "pdf-to-word": r = await op2.pdfToWord(f); break;
        case "ocr": r = await op2.ocr(f, x2.ocrLang, (p) => setX2((s) => ({ ...s, progress: p }))); break;
        case "highlight": if (!o.text) throw new Error("Type the words to highlight."); r = await op2.highlight(f, o.text); break;
        case "redact": if (!o.text) throw new Error("Type the words to black out."); r = await op2.redact(f, o.text); break;
        case "fill-form": r = await op2.fillForm(f, vals, x2.flat); break;
        case "flatten": r = await op2.flatten(f); break;
        case "extract-pages": r = await op2.extractPages(f, o.ranges); break;
        case "insert-blank": r = await op2.insertBlank(f, x2.after, x2.count); break;
        case "n-up": r = await op2.nUp(f, x2.per); break;
        case "compare": if (files.length < 2) throw new Error("Add two PDFs to compare."); r = await op2.compare(files[0]!, files[1]!); break;
      }
      if (tool.id === "compress" && r[0]) {
        const pct = Math.round((1 - r[0].blob.size / f.size) * 100);
        if (pct <= 0) setErr("This file is already well optimized — we couldn't make it smaller.");
      }
      setOuts(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setBusy(false); setX2((s) => ({ ...s, progress: "" })); }
  }

  async function ask() {
    const question = q.trim(); if (!question || busy) return;
    const next = [...chat, { role: "user" as const, content: question }];
    setChat(next); setQ(""); setBusy(true); setErr("");
    try {
      const res = await ai({ data: { mode: "chat", text: docText, history: next } });
      if ("error" in res && res.error) throw new Error(res.error);
      setChat([...next, { role: "assistant", content: "text" in res ? res.text ?? "" : "" }]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  const download = async (x: Out) => {
  try {
    if (Capacitor.isNativePlatform()) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };

        reader.onerror = reject;
        reader.readAsDataURL(x.blob);
      });

      const saved = await Filesystem.writeFile({
        path: x.name,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });

      await Share.share({
        title: x.name,
        text: "Your file is ready",
        url: saved.uri,
        dialogTitle: "Save or share your file",
      });

      return;
    }

    const a = document.createElement("a");
    a.href = URL.createObjectURL(x.blob);
    a.download = x.name;
    a.click();

    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (error) {
    console.error("Download failed:", error);
  }
};

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← All tools</Link>
        <div className="mt-4 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent text-3xl text-accent-foreground">{tool.icon}</div>
          <h1 className="mt-4 text-4xl font-extrabold">{tool.name}</h1>
          <p className="mt-2 text-muted-foreground">{tool.desc}</p>
        </div>

        <label
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          className={`mt-8 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? "border-primary bg-accent" : "bg-card hover:border-primary"}`}>
          <span className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
            Select {tool.multiple ? "files" : "file"}
          </span>
          <span className="mt-3 text-sm text-muted-foreground">or drop {tool.multiple ? "files" : "a file"} here</span>
          <input type="file" className="hidden" accept={tool.accept} multiple={tool.multiple} onChange={(e) => add(e.target.files)} />
        </label>

        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2 text-sm">
                <span className="truncate">{f.name} <span className="text-muted-foreground">· {(f.size / 1024).toFixed(0)} KB</span></span>
                <span className="flex gap-2">
                  {tool.multiple && <><button onClick={() => move(i, -1)}>↑</button><button onClick={() => move(i, 1)}>↓</button></>}
                  <button className="text-destructive" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>✕</button>
                </span>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
            {["split", "remove-pages", "organize", "extract-pages"].includes(tool.id) && (
              <div>
                <label className="text-sm font-medium">
                  {tool.id === "split" ? "Pages to extract" : tool.id === "remove-pages" ? "Pages to remove" : tool.id === "extract-pages" ? "Pages to keep" : "New page order"} (e.g. 1-3,5)
                </label>
                <input className={input} value={o.ranges} onChange={(e) => setO({ ...o, ranges: e.target.value })} disabled={o.every} />
                {tool.id === "split" && (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={o.every} onChange={(e) => setO({ ...o, every: e.target.checked })} /> Split every page into its own file
                  </label>
                )}
              </div>
            )}
            {tool.id === "rotate" && (
              <div className="flex gap-2">
                {[90, 180, 270].map((d) => (
                  <button key={d} onClick={() => setO({ ...o, deg: d })} className={`rounded-lg border px-4 py-2 text-sm ${o.deg === d ? "border-primary bg-accent" : ""}`}>{d}°</button>
                ))}
              </div>
            )}
            {(tool.id === "watermark" || tool.id === "edit") && (
              <div>
                <label className="text-sm font-medium">{tool.id === "edit" ? "Text to add" : "Watermark text"}</label>
                <textarea className={input} rows={tool.id === "edit" ? 3 : 1} placeholder={tool.id === "watermark" ? "CONFIDENTIAL" : "Your text"} value={o.text} onChange={(e) => setO({ ...o, text: e.target.value })} />
              </div>
            )}
            {(tool.id === "edit" || tool.id === "sign") && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Num label="Page" v={o.page} on={(v) => setO({ ...o, page: v })} />
                {tool.id === "edit" && <>
                  <Num label="From left %" v={o.x} on={(v) => setO({ ...o, x: v })} />
                  <Num label="From top %" v={o.y} on={(v) => setO({ ...o, y: v })} />
                  <Num label="Font size" v={o.size} on={(v) => setO({ ...o, size: v })} />
                </>}
              </div>
            )}
            {tool.id === "sign" && <SignaturePad cref={sigRef} />}
            {tool.id === "add-image" && (
              <div className="space-y-3">
                <input type="file" accept="image/png,image/jpeg" className={input} onChange={(e) => setImg(e.target.files?.[0] ?? null)} />
                <div className="grid grid-cols-3 gap-3">
                  <Num label="Page (0 = all)" v={o.page} on={(v) => setO({ ...o, page: v })} />
                  <Num label="Width % of page" v={o.scale} on={(v) => setO({ ...o, scale: v })} />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Position</label>
                    <select className={input} value={o.pos} onChange={(e) => setO({ ...o, pos: e.target.value })}>
                      {["top-left", "top", "top-right", "center", "bottom-left", "bottom", "bottom-right"].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
            {tool.id === "header-footer" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Txt label="Header" v={o.header} on={(v) => setO({ ...o, header: v })} />
                <Txt label="Footer" v={o.footer} on={(v) => setO({ ...o, footer: v })} />
              </div>
            )}
            {tool.id === "metadata" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Txt label="Title" v={o.title} on={(v) => setO({ ...o, title: v })} />
                <Txt label="Author" v={o.author} on={(v) => setO({ ...o, author: v })} />
                <Txt label="Subject" v={o.subject} on={(v) => setO({ ...o, subject: v })} />
                <Txt label="Keywords (comma separated)" v={o.keywords} on={(v) => setO({ ...o, keywords: v })} />
              </div>
            )}
            {(tool.id === "highlight" || tool.id === "redact") && (
              <Txt label={tool.id === "highlight" ? "Words to highlight (separate with commas)" : "Words to black out (separate with commas)"} v={o.text} on={(v) => setO({ ...o, text: v })} />
            )}
            {tool.id === "redact" && <p className="text-xs text-muted-foreground">Redacted pages are saved as images so the hidden text can't be copied back.</p>}
            {tool.id === "ai-translate" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Translate into</label>
                <select className={input} value={x2.lang} onChange={(e) => setX2({ ...x2, lang: e.target.value })}>
                  {["English", "Hindi", "Telugu", "Tamil", "Spanish", "French", "German", "Portuguese", "Arabic", "Chinese", "Japanese", "Korean", "Russian", "Italian", "Bengali", "Marathi"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            )}
            {tool.id === "ocr" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Document language</label>
                <select className={input} value={x2.ocrLang} onChange={(e) => setX2({ ...x2, ocrLang: e.target.value })}>
                  {[["eng", "English"], ["hin", "Hindi"], ["tel", "Telugu"], ["tam", "Tamil"], ["spa", "Spanish"], ["fra", "French"], ["deu", "German"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            {tool.id === "n-up" && (
              <div className="flex gap-2">
                {[2, 4].map((n) => <button key={n} onClick={() => setX2({ ...x2, per: n })} className={`rounded-lg border px-4 py-2 text-sm ${x2.per === n ? "border-primary bg-accent" : ""}`}>{n} pages per sheet</button>)}
              </div>
            )}
            {tool.id === "insert-blank" && (
              <div className="grid grid-cols-2 gap-3">
                <Num label="Insert after page (0 = at start)" v={x2.after} on={(v) => setX2({ ...x2, after: v })} />
                <Num label="How many blank pages" v={x2.count} on={(v) => setX2({ ...x2, count: v })} />
              </div>
            )}
            {tool.id === "compare" && files.length < 2 && <p className="text-sm text-muted-foreground">Add a second PDF to compare.</p>}
            {tool.id === "fill-form" && fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((fl) => (
                  <div key={fl.name}>
                    <label className="text-xs font-medium text-muted-foreground">{fl.name}</label>
                    {fl.type === "CheckBox" ? (
                      <input type="checkbox" className="ml-2" checked={!!vals[fl.name]} onChange={(e) => setVals({ ...vals, [fl.name]: e.target.checked ? "yes" : "" })} />
                    ) : fl.options.length ? (
                      <select className={input} value={vals[fl.name] ?? ""} onChange={(e) => setVals({ ...vals, [fl.name]: e.target.value })}>
                        <option value="">—</option>{fl.options.map((op) => <option key={op}>{op}</option>)}
                      </select>
                    ) : (
                      <input className={input} value={vals[fl.name] ?? ""} onChange={(e) => setVals({ ...vals, [fl.name]: e.target.value })} />
                    )}
                  </div>
                ))}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={x2.flat} onChange={(e) => setX2({ ...x2, flat: e.target.checked })} /> Lock the answers so they can't be changed</label>
              </div>
            )}
            {isAi && <p className="text-xs text-muted-foreground">✦ AI-powered: the text of your PDF is sent to our AI to create the answer. It is not stored.</p>}
            {tool.id === "crop" && <Num label="Trim from each edge (%)" v={o.crop} on={(v) => setO({ ...o, crop: Math.min(Math.max(v, 0), 40) })} />}
            {(tool.id === "protect" || tool.id === "unlock") && (
              <div>
                <label className="text-sm font-medium">{tool.id === "protect" ? "Set a password" : "Current password (leave empty if none)"}</label>
                <input type="password" className={input} value={o.password} onChange={(e) => setO({ ...o, password: e.target.value })} />
              </div>
            )}
            <button onClick={run} disabled={busy} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {busy ? (x2.progress || "Working…") : tool.id === "ai-chat" ? (docText ? "Reload document" : "Start chatting") : tool.name}
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">🛡 No sign up needed · Your file stays on your device and is never saved on our servers</p>
        {err && <p className="mt-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{err}</p>}
        {aiText && (
          <div className="mt-6 whitespace-pre-wrap rounded-2xl border bg-card p-6 text-sm leading-relaxed">
            <h2 className="mb-3 text-xl font-bold">{tool.id === "ai-summarize" ? "Summary" : "Translation"}</h2>{aiText}
          </div>
        )}
        {tool.id === "ai-chat" && docText && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-bold">Ask about {files[0]?.name}</h2>
            <div className="mt-4 space-y-3">
              {chat.length === 0 && <p className="text-sm text-muted-foreground">Try: "What is this document about?" or "List the key dates."</p>}
              {chat.map((m, i) => (
                <div key={i} className={`whitespace-pre-wrap rounded-lg px-4 py-3 text-sm ${m.role === "user" ? "ml-10 bg-primary text-primary-foreground" : "mr-10 bg-accent text-accent-foreground"}`}>{m.content}</div>
              ))}
              {busy && <div className="mr-10 rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">Thinking…</div>}
            </div>
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
              <input className={input} placeholder="Ask a question…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button disabled={busy || !q.trim()} className="rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">Ask</button>
            </form>
          </div>
        )}
        {outs.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-bold">Your files are ready</h2>
            <div className="mt-4 space-y-2">
              {outs.map((x, i) => (
                <button key={i} onClick={() => download(x)} className="flex w-full items-center justify-between rounded-lg bg-ink px-4 py-3 text-sm text-ink-foreground hover:opacity-90">
                  <span className="truncate">{x.name}</span><span>↓ {(x.blob.size / 1024).toFixed(0)} KB</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Num({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input type="number" className={input} value={v} onChange={(e) => on(Number(e.target.value))} />
    </div>
  );
}

function Txt({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input className={input} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}

function SignaturePad({ cref }: { cref: React.RefObject<HTMLCanvasElement | null> }) {
  const drawing = useRef(false);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 600, ((e.clientY - r.top) / r.height) * 200] as const;
  };
  return (
    <div>
      <div className="flex justify-between text-sm font-medium">
        <span>Draw your signature</span>
        <button className="text-primary" onClick={() => cref.current?.getContext("2d")?.clearRect(0, 0, 600, 200)}>Clear</button>
      </div>
      <canvas ref={cref} width={600} height={200} className="mt-2 w-full touch-none rounded-lg border bg-background"
        onPointerDown={(e) => { drawing.current = true; const c = e.currentTarget.getContext("2d")!; const [x, y] = pos(e); c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y); }}
        onPointerMove={(e) => { if (!drawing.current) return; const c = e.currentTarget.getContext("2d")!; const [x, y] = pos(e); c.lineTo(x, y); c.stroke(); }}
        onPointerUp={() => (drawing.current = false)} onPointerLeave={() => (drawing.current = false)} />
    </div>
  );
}
