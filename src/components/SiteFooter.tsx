import { Link } from "@tanstack/react-router";
import { TOOLS, type Tool } from "@/lib/tools";

const CATS: Tool["category"][] = ["AI", "Organize", "Optimize", "Convert", "Edit", "Security"];

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-ink-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-1">
            <div className="font-display text-xl font-extrabold">allpdfeditor</div>
            <p className="mt-3 max-w-xs text-sm text-ink-foreground/70">
              Every PDF tool you need — free, fast, and private. Files are processed on your device.
            </p>
          </div>
          {CATS.map((cat) => (
            <nav key={cat} aria-label={cat}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-foreground/60">
                {cat === "AI" ? "AI Tools" : cat}
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {TOOLS.filter((t) => t.category === cat).map((t) => (
                  <li key={t.id}>
                    <Link
                      to="/tool/$id"
                      params={{ id: t.id }}
                      className="text-ink-foreground/85 transition-colors hover:text-primary"
                    >
                      {t.name}
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
