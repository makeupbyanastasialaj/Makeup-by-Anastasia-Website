import Link from "next/link";
import BrandMark from "./BrandMark";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-sand/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandMark size="sm" />
        <nav className="flex items-center gap-6">
          <Link
            href="/#services"
            className="hidden text-sm tracking-wide text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            Services
          </Link>
          <Link
            href="/#how"
            className="hidden text-sm tracking-wide text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            How it works
          </Link>
          <Link href="/book" className="btn btn-primary !px-5 !py-2.5 text-xs">
            Book now
          </Link>
        </nav>
      </div>
    </header>
  );
}
