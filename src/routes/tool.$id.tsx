import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getTool } from "@/lib/tools";
import type { Out } from "@/lib/pdf-ops";

export const Route = createFileRoute("/tool/$id")({
  loader: ({ params }) => {
    const tool = getTool(params.id);
    if (!tool) throw notFound();
    return { tool };
  },
  head: ({ loaderData }) => {
    const t = loaderData?.tool;
    const title = t ? `${t.name} — pdfforge` : "Tool not found — pdfforge";
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
  const [o, setO] = useState({ ranges: "1-2", every: false, deg: 90, text: "", password: "", page: 1, x: 10, y: 10, size: 16 });
  const sigRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setFiles([]); setOuts([]); setErr(""); }, [tool.id]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles((p) => (tool.multiple ? [...p, ...arr] : arr.slice(0, 1)));
    setOuts([]);
  };
  const move = (i: number, d: number) =>
    setFiles((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  async function run() {
    setBusy(true); setErr(""); setOuts([]);
    try {
      const ops = await import("@/lib/pdf-ops");
      const f = files[0];
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
      }
      if (tool.id === "compress" && r[0]) {
        const pct = Math.round((1 - r[0].blob.size / f.size) * 100);
        if (pct <= 0) setErr("This file is already well optimized — we couldn't make it smaller.");
      }
      setOuts(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  const download = (x: Out) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(x.blob); a.download = x.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
            {["split", "remove-pages", "organize"].includes(tool.id) && (
              <div>
                <label className="text-sm font-medium">
                  {tool.id === "split" ? "Pages to extract" : tool.id === "remove-pages" ? "Pages to remove" : "New page order"} (e.g. 1-3,5)
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
            {(tool.id === "protect" || tool.id === "unlock") && (
              <div>
                <label className="text-sm font-medium">{tool.id === "protect" ? "Set a password" : "Current password (leave empty if none)"}</label>
                <input type="password" className={input} value={o.password} onChange={(e) => setO({ ...o, password: e.target.value })} />
              </div>
            )}
            <button onClick={run} disabled={busy} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {busy ? "Working…" : tool.name}
            </button>
          </div>
        )}

        {err && <p className="mt-4 rounded-lg bg-accent p-3 text-sm text-accent-foreground">{err}</p>}
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

function SignaturePad({ cref }: { cref: React.RefObject<HTMLCanvasElement | null> }) {
  const drawing = useRef(false);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 600, ((e.clientY - r.top) / r.height) * 200];
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
