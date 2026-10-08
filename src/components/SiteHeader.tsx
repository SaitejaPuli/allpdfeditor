import { Link } from "@tanstack/react-router";
import { TOOLS, type Tool } from "@/lib/tools";

const CATS: { name: Tool["category"]; label: string }[] = [
  { name: "AI", label: "AI Tools" },
  { name: "Organize", label: "Organize" },
  { name: "Convert", label: "Convert" },
  { name: "Edit", label: "Edit" },
  { name: "Security", label: "Security" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-display text-2xl font-extrabold">
          allpdf<span className="text-primary">editor</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {CATS.map((c) => {
            const tools = TOOLS.filter((t) => t.category === c.name);
            return (
              <div key={c.name} className="group relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-3 py-2 hover:text-primary"
                >
                  {c.label}
                  <span className="text-xs transition-transform group-hover:rotate-180">▾</span>
                </button>
                <div className="invisible absolute left-0 top-full z-30 w-56 rounded-xl border bg-background p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                  {tools.map((t) => (
                    <Link
                      key={t.id}
                      to="/tool/$id"
                      params={{ id: t.id }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted hover:text-primary"
                    >
                      <span className="w-5 text-center text-primary">{t.icon}</span>
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          <Link
            to="/"
            className="ml-2 rounded-full bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
          >
            All tools
          </Link>
        </nav>
      </div>
    </header>
  );
}
