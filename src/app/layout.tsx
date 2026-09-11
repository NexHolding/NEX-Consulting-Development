import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://www.next-consulting.com"),
  title: {
    default: "Next Consulting — Websites, die mehr können.",
    template: "%s | Next Consulting",
  },
  description:
    "Individuelle Websites, Automatisierung, KI und CRM. Wir verbinden Ihren digitalen Auftritt mit den Abläufen dahinter.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
