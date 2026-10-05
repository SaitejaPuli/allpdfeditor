// Browser-only PDF operations. All libraries are imported lazily.
export type Out = { name: string; blob: Blob };

const pdfBlob = (b: Uint8Array) => new Blob([b as BlobPart], { type: "application/pdf" });
const base = (f: File) => f.name.replace(/\.[^.]+$/, "");

async function lib() {
  return import("pdf-lib");
}

async function pdfjs() {
  const p = await import("pdfjs-dist");
  const w = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  p.GlobalWorkerOptions.workerSrc = w.default;
  return p;
}

export function parseRanges(s: string, max: number): number[] {
  const out: number[] = [];
  for (const part of s.split(",").map((x) => x.trim()).filter(Boolean)) {
    const nums = part.split("-").map((n) => parseInt(n, 10));
    const a = nums[0] ?? NaN; const b = nums[1] ?? NaN;
    const end = isNaN(b) ? a : b;
    for (let i = a; i <= end; i++) if (i >= 1 && i <= max) out.push(i - 1);
  }
  return out;
}

const load = async (f: File) => {
  const { PDFDocument } = await lib();
  return PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
};

export async function merge(files: File[]): Promise<Out[]> {
  const { PDFDocument } = await lib();
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await load(f);
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  }
  return [{ name: "merged.pdf", blob: pdfBlob(await out.save()) }];
}

async function pick(f: File, idx: number[], name: string): Promise<Out> {
  const { PDFDocument } = await lib();
  const src = await load(f);
  const out = await PDFDocument.create();
  (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
  return { name, blob: pdfBlob(await out.save()) };
}

export async function split(f: File, ranges: string, every: boolean): Promise<Out[]> {
  const src = await load(f);
  const n = src.getPageCount();
  if (every) {
    const res: Out[] = [];
    for (let i = 0; i < n; i++) res.push(await pick(f, [i], `${base(f)}-page-${i + 1}.pdf`));
    return res;
  }
  return [await pick(f, parseRanges(ranges, n), `${base(f)}-split.pdf`)];
}

export async function removePages(f: File, ranges: string): Promise<Out[]> {
  const n = (await load(f)).getPageCount();
  const rm = new Set(parseRanges(ranges, n));
  const keep = [...Array(n).keys()].filter((i) => !rm.has(i));
  return [await pick(f, keep, `${base(f)}-edited.pdf`)];
}

export async function organize(f: File, order: string): Promise<Out[]> {
  const n = (await load(f)).getPageCount();
  return [await pick(f, parseRanges(order, n), `${base(f)}-organized.pdf`)];
}

export async function compress(f: File): Promise<Out[]> {
  const doc = await load(f);
  doc.setTitle(""); doc.setProducer(""); doc.setCreator("");
  const bytes = await doc.save({ useObjectStreams: true });
  return [{ name: `${base(f)}-compressed.pdf`, blob: pdfBlob(bytes) }];
}

export async function rotate(f: File, deg: number): Promise<Out[]> {
  const { degrees } = await lib();
  const doc = await load(f);
  doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
  return [{ name: `${base(f)}-rotated.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function imagesToPdf(files: File[]): Promise<Out[]> {
  const { PDFDocument } = await lib();
  const doc = await PDFDocument.create();
  for (const f of files) {
    const buf = await f.arrayBuffer();
    const img = f.type === "image/png" ? await doc.embedPng(buf) : await doc.embedJpg(buf);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return [{ name: "images.pdf", blob: pdfBlob(await doc.save()) }];
}

async function renderPages(f: File, password?: string, scale = 2) {
  const p = await pdfjs();
  const pdf = await p.getDocument({ data: new Uint8Array(await f.arrayBuffer()), password }).promise;
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    canvases.push(c);
  }
  return canvases;
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.92));

export async function pdfToJpg(f: File): Promise<Out[]> {
  const cs = await renderPages(f);
  return Promise.all(cs.map(async (c, i) => ({ name: `${base(f)}-${i + 1}.jpg`, blob: await toBlob(c) })));
}

export async function watermark(f: File, text: string): Promise<Out[]> {
  const { StandardFonts, rgb, degrees } = await lib();
  const doc = await load(f);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const p of doc.getPages()) {
    const { width, height } = p.getSize();
    const size = Math.min(width, height) / 8;
    const w = font.widthOfTextAtSize(text, size);
    p.drawText(text, {
      x: width / 2 - (w / 2) * 0.7, y: height / 2 - (w / 2) * 0.7, size, font,
      color: rgb(0.85, 0.2, 0.2), opacity: 0.25, rotate: degrees(45),
    });
  }
  return [{ name: `${base(f)}-watermarked.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function pageNumbers(f: File): Promise<Out[]> {
  const { StandardFonts, rgb } = await lib();
  const doc = await load(f);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const t = `${i + 1} / ${pages.length}`;
    const w = font.widthOfTextAtSize(t, 10);
    p.drawText(t, { x: p.getWidth() / 2 - w / 2, y: 20, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  });
  return [{ name: `${base(f)}-numbered.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function addText(f: File, text: string, page: number, xPct: number, yPct: number, size: number): Promise<Out[]> {
  const { StandardFonts, rgb } = await lib();
  const doc = await load(f);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.getPage(Math.min(Math.max(page - 1, 0), doc.getPageCount() - 1));
  const { width, height } = p.getSize();
  text.split("\n").forEach((line, i) =>
    p.drawText(line, { x: (width * xPct) / 100, y: height - (height * yPct) / 100 - i * size * 1.2, size, font, color: rgb(0.1, 0.1, 0.1) }),
  );
  return [{ name: `${base(f)}-edited.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function sign(f: File, pngDataUrl: string, page: number): Promise<Out[]> {
  const doc = await load(f);
  const img = await doc.embedPng(pngDataUrl);
  const p = doc.getPage(Math.min(Math.max(page - 1, 0), doc.getPageCount() - 1));
  const w = p.getWidth() * 0.3;
  const h = (img.height / img.width) * w;
  p.drawImage(img, { x: p.getWidth() - w - 40, y: 40, width: w, height: h });
  return [{ name: `${base(f)}-signed.pdf`, blob: pdfBlob(await doc.save()) }];
}

export async function protect(f: File, password: string): Promise<Out[]> {
  const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt-lite");
  const bytes = await encryptPDF(new Uint8Array(await f.arrayBuffer()), password, password);
  return [{ name: `${base(f)}-locked.pdf`, blob: pdfBlob(bytes) }];
}

export async function unlock(f: File, password: string): Promise<Out[]> {
  const { PDFDocument } = await lib();
  let cs: HTMLCanvasElement[];
  try {
    cs = await renderPages(f, password);
  } catch (e) {
    console.error(e);
    throw new Error("Wrong password, or this file can't be opened.");
  }
  const doc = await PDFDocument.create();
  for (const c of cs) {
    const img = await doc.embedJpg(await (await toBlob(c)).arrayBuffer());
    const page = doc.addPage([c.width / 2, c.height / 2]);
    page.drawImage(img, { x: 0, y: 0, width: c.width / 2, height: c.height / 2 });
  }
  return [{ name: `${base(f)}-unlocked.pdf`, blob: pdfBlob(await doc.save()) }];
}
