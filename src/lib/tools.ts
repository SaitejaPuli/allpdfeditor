export type ToolId =
  | "merge" | "split" | "compress" | "rotate" | "remove-pages" | "organize"
  | "jpg-to-pdf" | "pdf-to-jpg" | "watermark" | "page-numbers" | "edit"
  | "protect" | "unlock" | "sign" | "grayscale" | "pdf-to-text" | "add-image" | "header-footer" | "metadata" | "reverse" | "crop" | "pdf-to-png"
  | "ai-summarize" | "ai-chat" | "ai-translate" | "word-to-pdf" | "excel-to-pdf" | "html-to-pdf" | "text-to-pdf" | "pdf-to-word" | "ocr"
  | "highlight" | "redact" | "fill-form" | "flatten" | "extract-pages" | "insert-blank" | "compare" | "n-up";

export type Tool = {
  id: ToolId;
  name: string;
  desc: string;
  icon: string;
  category: "AI" | "Organize" | "Optimize" | "Convert" | "Edit" | "Security";
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
  { id: "grayscale", name: "Grayscale PDF", desc: "Convert every page to black and white.", icon: "◐", category: "Optimize", accept: "application/pdf" },
  { id: "pdf-to-text", name: "PDF to Text", desc: "Extract all the text from a PDF into a .txt file.", icon: "¶", category: "Convert", accept: "application/pdf" },
  { id: "pdf-to-png", name: "PDF to PNG", desc: "Export each page as a crisp PNG image.", icon: "▤", category: "Convert", accept: "application/pdf" },
  { id: "add-image", name: "Add Image", desc: "Place a logo or stamp image on a page.", icon: "▧", category: "Edit", accept: "application/pdf" },
  { id: "header-footer", name: "Header & Footer", desc: "Add header and footer text to every page.", icon: "≡", category: "Edit", accept: "application/pdf" },
  { id: "metadata", name: "Edit Metadata", desc: "Change the title, author and subject of a PDF.", icon: "ⓘ", category: "Edit", accept: "application/pdf" },
  { id: "reverse", name: "Reverse Pages", desc: "Flip the page order, last page first.", icon: "⇅", category: "Organize", accept: "application/pdf" },
  { id: "crop", name: "Crop PDF", desc: "Trim margins evenly from every page.", icon: "⌗", category: "Edit", accept: "application/pdf" },
  { id: "ai-summarize", name: "AI Summarize PDF", desc: "Get a short summary and key points of any PDF in seconds.", icon: "✦", category: "AI", accept: "application/pdf" },
  { id: "ai-chat", name: "Chat with PDF", desc: "Ask questions about your PDF and get instant answers.", icon: "💬", category: "AI", accept: "application/pdf" },
  { id: "ai-translate", name: "AI Translate PDF", desc: "Translate the text of a PDF into another language.", icon: "🌐", category: "AI", accept: "application/pdf" },
  { id: "word-to-pdf", name: "Word to PDF", desc: "Turn a Word document (.docx) into a PDF.", icon: "W", category: "Convert", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { id: "excel-to-pdf", name: "Excel to PDF", desc: "Turn spreadsheets (.xlsx, .xls, .csv) into a PDF.", icon: "X", category: "Convert", accept: ".xlsx,.xls,.csv" },
  { id: "html-to-pdf", name: "HTML to PDF", desc: "Turn a saved web page (.html) into a PDF.", icon: "</>", category: "Convert", accept: ".html,.htm,text/html" },
  { id: "text-to-pdf", name: "Text to PDF", desc: "Turn a plain .txt file into a clean PDF.", icon: "T", category: "Convert", accept: ".txt,text/plain" },
  { id: "pdf-to-word", name: "PDF to Word", desc: "Turn a PDF into an editable Word document.", icon: "⇢W", category: "Convert", accept: "application/pdf" },
  { id: "ocr", name: "OCR PDF", desc: "Read text from scanned PDFs and photos.", icon: "👁", category: "Convert", accept: "application/pdf,image/png,image/jpeg" },
  { id: "highlight", name: "Highlight PDF", desc: "Highlight every place a word or phrase appears.", icon: "🖍", category: "Edit", accept: "application/pdf" },
  { id: "redact", name: "Redact PDF", desc: "Permanently black out private words, names or numbers.", icon: "▮", category: "Security", accept: "application/pdf" },
  { id: "fill-form", name: "Fill PDF Form", desc: "Type into the fields of a fillable PDF form.", icon: "☑", category: "Edit", accept: "application/pdf" },
  { id: "flatten", name: "Flatten PDF", desc: "Lock form fields and annotations so they can't be changed.", icon: "▭", category: "Security", accept: "application/pdf" },
  { id: "extract-pages", name: "Extract Pages", desc: "Save only the pages you pick into a new PDF.", icon: "⇱", category: "Organize", accept: "application/pdf" },
  { id: "insert-blank", name: "Insert Blank Page", desc: "Add empty pages anywhere in your PDF.", icon: "▢", category: "Organize", accept: "application/pdf" },
  { id: "compare", name: "Compare PDF", desc: "Find the text differences between two PDFs.", icon: "⇄", category: "Organize", accept: "application/pdf", multiple: true },
  { id: "n-up", name: "N-up PDF", desc: "Print 2 or 4 pages on one sheet to save paper.", icon: "⊞", category: "Organize", accept: "application/pdf" },
];

export const getTool = (id: string) => TOOLS.find((t) => t.id === id);
