// Additional browser-only PDF operations.
import { pdfjs, renderPages, imagesDoc, parseRanges, type Out } from "./pdf-ops";

const pdfBlob = (b: Uint8Array) => new Blob([b as BlobPart], { type: "application/pdf" });
const base = (f: File) => f.name.replace(/\.[^.]+$/, "");
const lib = () => import("pdf-lib");
const load = async (f: File) => (await lib()).PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
// Standard PDF fonts only cover Latin characters.
const safe = (s: string) => s.replace(/\t/g, "    ").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2022/g, "*").replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "?");

/* ---------- Text extraction ---------- */
export async function extractText(f: File): Promise<string> {
  const p = await pdfjs();
  const pdf = await p.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    text += `[Page ${i}]\n` + tc.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("") + "\n\n";
  }
  return text;
}

/* ---------- Text -> PDF layout ---------- */
type Block = { text: string; bold?: boolean; size?: number; mono?: boolean };
async function layoutPdf(blocks: Block[]) {
  const { PDFDocument, StandardFonts, rgb } = await lib();
  const doc = await PDFDocument.create();
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const W = 595, H = 842, M = 50;
  let page = doc.addPage([W, H]); let y = H - M;
  for (const b of blocks) {
    const font = b.mono ? mono : b.bold ? bold : reg; const size = b.size ?? 11; const lh = size * 1.4;
    const lines: string[] = [];
    for (const para of safe(b.text).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const t = line ? line + " " + word : word;
        if (font.widthOfTextAtSize(t, size) > W - 2 * M && line) { lines.push(line); line = word; } else line = t;
      }
      lines.push(line);
    }
    for (const l of lines) {
      if (y - lh < M) { page = doc.addPage([W, H]); y = H - M; }
      y -= lh;
      page.drawText(l, { x: M, y, size, font, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= size * 0.5;
  }
  return pdfBlob(await doc.save());
}

export async function textToPdf(f: File): Promise<Out[]> {
  return [{ name: `${base(f)}.pdf`, blob: await layoutPdf([{ text: await f.text() }]) }];
}

export async function wordToPdf(f: File): Promise<Out[]> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
  return [{ name: `${base(f)}.pdf`, blob: await layoutPdf(htmlBlocks(value)) }];
}

function htmlBlocks(html: string): Block[] {
  const d = new DOMParser().parseFromString(html, "text/html");
  const out: Block[] = [];
  d.body.querySelectorAll("h1,h2,h3,h4,p,li,pre,td").forEach((el) => {
    const t = (el.textContent || "").trim(); if (!t) return;
    const tag = el.tagName;
    if (tag === "TD" && el.closest("li,p")) return;
    out.push(tag === "H1" ? { text: t, bold: true, size: 20 } : tag === "H2" ? { text: t, bold: true, size: 16 } : /H[34]/.test(tag) ? { text: t, bold: true, size: 13 } : tag === "LI" ? { text: "* " + t } : tag === "PRE" ? { text: t, mono: true, size: 9 } : { text: t });
  });
  if (!out.length) out.push({ text: d.body.textContent || "" });
  return out;
}

export async function htmlToPdf(f: File): Promise<Out[]> {
  return [{ name: `${base(f)}.pdf`, blob: await layoutPdf(htmlBlocks(await f.text())) }];
}

export async function excelToPdf(f: File): Promise<Out[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await f.arrayBuffer());
  const blocks: Block[] = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name]!, { header: 1, defval: "", raw: false });
    if (!rows.length) continue;
    const cols = Math.max(...rows.map((r) => r.length));
    const widths = Array.from({ length: cols }, (_, c) => Math.min(24, Math.max(3, ...rows.map((r) => String(r[c] ?? "").length))));
    const fmt = (r: string[]) => widths.map((w, c) => String(r[c] ?? "").slice(0, w).padEnd(w)).join(" | ");
    blocks.push({ text: name, bold: true, size: 14 });
    blocks.push({ text: rows.map(fmt).join("\n"), mono: true, size: 7 });
  }
  return [{ name: `${base(f)}.pdf`, blob: await layoutPdf(blocks) }];
}

export async function pdfToWord(f: File): Promise<Out[]> {
  const text = await extractText(f);
  const { Document, Packer, Paragraph, HeadingLevel, PageBreak } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [];
  text.split(/\[Page \d+\]\n/).filter((x) => x.trim()).forEach((pg, i) => {
    if (i > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
    for (const line of pg.split("\n")) if (line.trim()) children.push(new Paragraph({ text: line.trim(), heading: line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line) ? HeadingLevel.HEADING_2 : undefined }));
  });
  if (!children.length) throw new Error("No text found. If this is a scanned PDF, try the OCR tool first.");
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  return [{ name: `${base(f)}.docx`, blob }];
}

export async function ocr(f: File, lang: string, onProgress?: (s: string) => void): Promise<Out[]> {
  const { createWorker } = await import("tesseract.js");
  const cs = f.type.startsWith("image/") ? [await imageCanvas(f)] : await renderPages(f, undefined, 2);
  const worker = await createWorker(lang || "eng");
  let text = "";
  for (let i = 0; i < cs.length; i++) {
    onProgress?.(`Reading page ${i + 1} of ${cs.length}…`);
    const { data } = await worker.recognize(cs[i]!);
    text += `--- Page ${i + 1} ---\n${data.text}\n\n`;
  }
  await worker.terminate();
  return [{ name: `${base(f)}-ocr.txt`, blob: new Blob([text], { type: "text/plain" }) }];
}

async function imageCanvas(f: File) {
  const bmp = await createImageBitmap(f);
  const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0); return c;
}

/* ---------- Search-based edits ---------- */
type Hit = { page: number; x: number; y: number; w: number; h: number };
async function findText(f: File, term: string): Promise<Hit[]> {
  const p = await pdfjs();
  const pdf = await p.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
  const hits: Hit[] = []; const q = term.toLowerCase();
  for (let i = 1; i <= pdf.numPages; i++) {
    const tc = await (await pdf.getPage(i)).getTextContent();
    for (const it of tc.items) {
      if (!("str" in it) || !it.str) continue;
      const s = it.str.toLowerCase(); const [, , , d, e, fy] = it.transform as number[];
      const h = it.height || Math.abs(d ?? 10); const cw = it.width / it.str.length;
      let idx = s.indexOf(q);
      while (idx >= 0) { hits.push({ page: i - 1, x: e! + idx * cw, y: fy! - h * 0.2, w: q.length * cw, h: h * 1.2 }); idx = s.indexOf(q, idx + q.length); }
    }
  }
  return hits;
}

export async function highlight(f: File, terms: string): Promise<Out[]> {
  const { rgb } = await lib();
  const doc = await load(f); const pages = doc.getPages(); let n = 0;
  for (const t of terms.split(",").map((x) => x.trim()).filter(Boolean))
    for (const h of await findText(f, t)) { pages[h.page]?.drawRectangle({ x: h.x, y: h.y, width: h.w, height: h.h, color: rgb(1, 0.9, 0.1), opacity: 0.4 }); n++; }
  if (!n) throw new Error("We couldn't find that text in the PDF.");
  return [{ name: `${base(f)}-highlighted.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function redact(f: File, terms: string): Promise<Out[]> {
  const { rgb } = await lib();
  const doc = await load(f); const pages = doc.getPages(); let n = 0;
  for (const t of terms.split(",").map((x) => x.trim()).filter(Boolean))
    for (const h of await findText(f, t)) { pages[h.page]?.drawRectangle({ x: h.x - 1, y: h.y, width: h.w + 2, height: h.h, color: rgb(0, 0, 0) }); n++; }
  if (!n) throw new Error("We couldn't find that text in the PDF.");
  // Flatten to images so the hidden text is truly removed.
  const boxed = new File([pdfBlob(await doc.save())], f.name, { type: "application/pdf" });
  return [{ name: `${base(f)}-redacted.pdf`, blob: pdfBlob(await imagesDoc(await renderPages(boxed))) }];
}

/* ---------- Forms ---------- */
export async function readFields(f: File) {
  const doc = await load(f);
  return doc.getForm().getFields().map((fl) => {
    const type = fl.constructor.name.replace("PDF", "").replace("Field", "");
    let value = "";
    try { if ("getText" in fl) value = (fl as { getText: () => string | undefined }).getText() ?? ""; } catch { /* ignore */ }
    try { if ("isChecked" in fl) value = (fl as { isChecked: () => boolean }).isChecked() ? "yes" : ""; } catch { /* ignore */ }
    try { if ("getSelected" in fl) value = ((fl as { getSelected: () => string[] }).getSelected() ?? [])[0] ?? ""; } catch { /* ignore */ }
    let options: string[] = [];
    try { if ("getOptions" in fl) options = (fl as { getOptions: () => string[] }).getOptions(); } catch { /* ignore */ }
    return { name: fl.getName(), type, value, options };
  });
}

export async function fillForm(f: File, values: Record<string, string>, flatten: boolean): Promise<Out[]> {
  const doc = await load(f); const form = doc.getForm();
  for (const fl of form.getFields()) {
    const v = values[fl.getName()]; if (v === undefined) continue;
    try {
      if ("setText" in fl) (fl as { setText: (s: string) => void }).setText(v);
      else if ("check" in fl) v ? (fl as { check: () => void }).check() : (fl as { uncheck: () => void }).uncheck();
      else if ("select" in fl && v) (fl as { select: (s: string) => void }).select(v);
    } catch { /* skip fields that can't be set */ }
  }
  if (flatten) form.flatten();
  return [{ name: `${base(f)}-filled.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function flatten(f: File): Promise<Out[]> {
  const doc = await load(f);
  const form = doc.getForm();
  if (form.getFields().length) { form.flatten(); return [{ name: `${base(f)}-flat.pdf`, blob: pdfBlob(await doc.save()) }]; }
  // No form fields: flatten annotations and everything into images.
  return [{ name: `${base(f)}-flat.pdf`, blob: pdfBlob(await imagesDoc(await renderPages(f))) }];
}

/* ---------- Page tools ---------- */
export async function extractPages(f: File, ranges: string): Promise<Out[]> {
  const { PDFDocument } = await lib();
  const src = await load(f); const idx = parseRanges(ranges, src.getPageCount());
  if (!idx.length) throw new Error("Enter which pages to extract, like 1-3,5.");
  const doc = await PDFDocument.create();
  (await doc.copyPages(src, idx)).forEach((p) => doc.addPage(p));
  return [{ name: `${base(f)}-extracted.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function insertBlank(f: File, after: number, count: number): Promise<Out[]> {
  const doc = await load(f); const n = doc.getPageCount();
  const at = Math.min(Math.max(after, 0), n);
  const ref = doc.getPage(Math.max(0, Math.min(at, n) - 1) || 0).getSize();
  for (let i = 0; i < Math.max(1, Math.min(count, 50)); i++) doc.insertPage(at + i, [ref.width, ref.height]);
  return [{ name: `${base(f)}-blank-added.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function nUp(f: File, per: number): Promise<Out[]> {
  const { PDFDocument } = await lib();
  const src = await load(f); const doc = await PDFDocument.create();
  const embedded = await doc.embedPages(src.getPages());
  const W = 842, H = 595; // landscape A4 for 2-up
  const [cols, rows, pw, ph] = per === 2 ? [2, 1, W, H] : [2, 2, 595, 842];
  for (let i = 0; i < embedded.length; i += per) {
    const page = doc.addPage([pw, ph]);
    const cw = pw / cols, ch = ph / rows;
    for (let k = 0; k < per && i + k < embedded.length; k++) {
      const e = embedded[i + k]!; const s = Math.min((cw - 20) / e.width, (ch - 20) / e.height);
      const c = k % cols, r = Math.floor(k / cols);
      page.drawPage(e, { x: c * cw + (cw - e.width * s) / 2, y: ph - (r + 1) * ch + (ch - e.height * s) / 2, width: e.width * s, height: e.height * s });
    }
  }
  return [{ name: `${base(f)}-${per}-up.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function compare(a: File, b: File): Promise<Out[]> {
  const [ta, tb] = await Promise.all([extractText(a), extractText(b)]);
  const la = ta.split("\n").map((s) => s.trim()).filter(Boolean);
  const lb = tb.split("\n").map((s) => s.trim()).filter(Boolean);
  const sa = new Set(la), sb = new Set(lb);
  const removed = la.filter((l) => !sb.has(l) && !/^\[Page \d+\]$/.test(l));
  const added = lb.filter((l) => !sa.has(l) && !/^\[Page \d+\]$/.test(l));
  const report = `Comparison of\n  A: ${a.name}\n  B: ${b.name}\n\n` +
    (removed.length || added.length ? "" : "No text differences found.\n\n") +
    `Only in A (${removed.length} lines):\n${removed.map((l) => "- " + l).join("\n") || "(none)"}\n\n` +
    `Only in B (${added.length} lines):\n${added.map((l) => "+ " + l).join("\n") || "(none)"}\n`;
  return [{ name: "comparison.txt", blob: new Blob([report], { type: "text/plain" }) }];
}
