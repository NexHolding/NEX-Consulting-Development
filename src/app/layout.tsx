import "./portal.css";
import type { Metadata } from "next";
import { brandSlogan } from "@/lib/content";
import "./globals.css";
import "./reference-design.css";
import "./brand.css";
import "./crm-design.css";
import "./loading-design.css";
import "./offer-design.css";
import { GlobalLoading } from "@/components/brand-loading";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.next-consulting.com"),
  title: {
    default: `NEX Consulting — ${brandSlogan}`,
    template: "%s | NEX Consulting",
  },
  description:
    "Individuelle Websites, Automatisierung, KI und CRM. Wir verbinden Ihren digitalen Auftritt mit den Abläufen dahinter.",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: "/brand/nex-consulting-icon.png",
  },
  openGraph: {
    title: `NEX Consulting — ${brandSlogan}`,
    images: [
      {
        url: "/brand/nex-consulting-logo.png",
        width: 3125,
        height: 1875,
        alt: "NEX Consulting",
      },
    ],
  },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        {children}
        <GlobalLoading />
      </body>
    </html>
  );
}
