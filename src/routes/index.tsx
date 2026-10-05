import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { TOOLS } from "@/lib/tools";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "pdfforge — Every PDF tool you need, free" },
      { name: "description", content: "Merge, split, compress, edit, sign, lock and unlock PDFs right in your browser. Files never leave your device." },
      { property: "og:title", content: "pdfforge — Every PDF tool you need" },
      { property: "og:description", content: "Merge, split, compress, edit, sign, lock and unlock PDFs in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CATS = ["All", "Organize", "Optimize", "Convert", "Edit", "Security"] as const;

function Index() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const list = TOOLS.filter((t) => cat === "All" || t.category === cat);
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-16 text-center">
        <h1 className="text-4xl font-extrabold md:text-6xl">
          Every tool you need to work with <span className="text-primary">PDFs</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Merge, split, compress, edit, sign, lock and unlock — free, fast, and private. Your files are processed in your browser and never uploaded.
        </p>
      </section>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2 px-6">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${cat === c ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-primary"}`}>
            {c}
          </button>
        ))}
      </div>
      <main className="mx-auto grid max-w-6xl gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((t) => (
          <Link key={t.id} to="/tool/$id" params={{ id: t.id }} className="tool-card p-6">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent text-2xl text-accent-foreground">{t.icon}</div>
            <h3 className="mt-4 text-lg font-bold">{t.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
          </Link>
        ))}
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 pdfforge · 100% in-browser processing
      </footer>
    </div>
  );
}
