import { Link } from "@tanstack/react-router";

const COLS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Home", to: "/" },
      { label: "All tools", to: "/" },
      { label: "Merge PDF", to: "/tool/merge" },
      { label: "Split PDF", to: "/tool/split" },
      { label: "Compress PDF", to: "/tool/compress" },
      { label: "Edit PDF", to: "/tool/edit" },
    ],
  },
  {
    title: "Convert",
    links: [
      { label: "JPG to PDF", to: "/tool/jpg-to-pdf" },
      { label: "PDF to JPG", to: "/tool/pdf-to-jpg" },
      { label: "PDF to PNG", to: "/tool/pdf-to-png" },
      { label: "PDF to Text", to: "/tool/pdf-to-text" },
    ],
  },
  {
    title: "Organize",
    links: [
      { label: "Remove Pages", to: "/tool/remove-pages" },
      { label: "Rotate PDF", to: "/tool/rotate" },
      { label: "Reverse Pages", to: "/tool/reverse" },
      { label: "Crop PDF", to: "/tool/crop" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Lock PDF", to: "/tool/protect" },
      { label: "Unlock PDF", to: "/tool/unlock" },
      { label: "Sign PDF", to: "/tool/sign" },
      { label: "Add Watermark", to: "/tool/watermark" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-ink-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <div className="font-display text-xl font-extrabold">allpdfeditor</div>
            <p className="mt-3 max-w-xs text-sm text-ink-foreground/70">
              Every PDF tool you need — free, fast, and private. Files are processed on your device.
            </p>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-foreground/60">
                {c.title}
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-ink-foreground/85 transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-2 text-xs font-medium">
          {["No sign up", "Free forever", "No uploads", "Nothing stored"].map((b) => (
            <span
              key={b}
              className="rounded-full border border-ink-foreground/25 px-3 py-1 text-ink-foreground/80"
            >
              ✓ {b}
            </span>
          ))}
        </div>

        <div className="mt-8 border-t border-ink-foreground/15 pt-6 text-sm text-ink-foreground/70">
          © 2026 allpdfeditor. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
