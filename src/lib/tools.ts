export type ToolId =
  | "merge" | "split" | "compress" | "rotate" | "remove-pages" | "organize"
  | "jpg-to-pdf" | "pdf-to-jpg" | "watermark" | "page-numbers" | "edit"
  | "protect" | "unlock" | "sign";

export type Tool = {
  id: ToolId;
  name: string;
  desc: string;
  icon: string;
  category: "Organize" | "Optimize" | "Convert" | "Edit" | "Security";
  accept: string;
  multiple?: boolean;
};

export const TOOLS: Tool[] = [
  { id: "merge", name: "Merge PDF", desc: "Combine several PDFs into one file, in the order you choose.", icon: "⊕", category: "Organize", accept: "application/pdf", multiple: true },
  { id: "split", name: "Split PDF", desc: "Pull out a page range or split every page into its own file.", icon: "✂", category: "Organize", accept: "application/pdf" },
  { id: "remove-pages", name: "Remove Pages", desc: "Delete the pages you don't need.", icon: "⌫", category: "Organize", accept: "application/pdf" },
  { id: "organize", name: "Organize PDF", desc: "Reorder pages with a simple sequence like 3,1,2.", icon: "☰", category: "Organize", accept: "application/pdf" },
  { id: "compress", name: "Compress PDF", desc: "Shrink file size by re-saving with object streams.", icon: "⇲", category: "Optimize", accept: "application/pdf" },
  { id: "rotate", name: "Rotate PDF", desc: "Turn all pages 90°, 180° or 270°.", icon: "↻", category: "Organize", accept: "application/pdf" },
  { id: "jpg-to-pdf", name: "JPG to PDF", desc: "Turn JPG and PNG images into a PDF.", icon: "▣", category: "Convert", accept: "image/jpeg,image/png", multiple: true },
  { id: "pdf-to-jpg", name: "PDF to JPG", desc: "Export every page as a high quality image.", icon: "◫", category: "Convert", accept: "application/pdf" },
  { id: "edit", name: "Edit PDF", desc: "Add text anywhere on a page.", icon: "✎", category: "Edit", accept: "application/pdf" },
  { id: "watermark", name: "Add Watermark", desc: "Stamp text diagonally across every page.", icon: "◈", category: "Edit", accept: "application/pdf" },
  { id: "page-numbers", name: "Page Numbers", desc: "Number your pages at the bottom.", icon: "#", category: "Edit", accept: "application/pdf" },
  { id: "sign", name: "Sign PDF", desc: "Draw your signature and place it on a page.", icon: "✍", category: "Edit", accept: "application/pdf" },
  { id: "protect", name: "Lock PDF", desc: "Protect a PDF with a password.", icon: "🔒", category: "Security", accept: "application/pdf" },
  { id: "unlock", name: "Unlock PDF", desc: "Remove the password from a PDF you can open.", icon: "🔓", category: "Security", accept: "application/pdf" },
];

export const getTool = (id: string) => TOOLS.find((t) => t.id === id);
