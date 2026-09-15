import Image from "next/image";
import Link from "./app-link";

/** Original artwork, with transparent canvas margins removed only in the layout. */
export function BrandLogo({
  className = "",
  eager = false,
}: {
  className?: string;
  eager?: boolean;
}) {
  return (
    <span className={`nex-logo ${className}`}>
      <Image
        loading={eager ? "eager" : "lazy"}
        src="/brand/nex-consulting-logo.png"
        alt="NEX Consulting"
        width={3125}
        height={1875}
        sizes="(max-width: 600px) 320px, 360px"
        className="nex-logo-artwork"
      />
    </span>
  );
}
export function Brand({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`brand nex-brand ${className}`}
      aria-label="NEX Consulting – Startseite"
    >
      <BrandLogo />
    </Link>
  );
}
