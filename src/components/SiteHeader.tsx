import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="font-display text-2xl font-extrabold">
          pdf<span className="text-primary">forge</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium md:flex">
          {[["merge", "Merge"], ["split", "Split"], ["compress", "Compress"], ["edit", "Edit"], ["protect", "Lock"], ["unlock", "Unlock"]].map(([id, l]) => (
            <Link key={id} to="/tool/$id" params={{ id }} className="hover:text-primary" activeProps={{ className: "text-primary" }}>
              {l}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
