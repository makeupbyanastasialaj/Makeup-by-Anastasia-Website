import Link from "next/link";

/**
 * Text version of the logo: "MAKEUP BY" eyebrow over the "Anastasia Laj"
 * signature script. Transparent and scalable — used in the nav and footer.
 */
export default function BrandMark({
  size = "md",
  href = "/",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
}) {
  const script = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-5xl md:text-6xl",
  }[size];
  const eyebrow = {
    sm: "text-[0.55rem]",
    md: "text-[0.6rem]",
    lg: "text-xs",
  }[size];

  const inner = (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className={`eyebrow ${eyebrow} !text-ink-soft`}>Makeup by</span>
      <span className={`script ${script} text-ink -mt-0.5`}>Anastasia&nbsp;Laj</span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} aria-label="Makeup by Anastasia Laj — home">
      {inner}
    </Link>
  );
}
