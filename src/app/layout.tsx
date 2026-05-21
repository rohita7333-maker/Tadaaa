import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, Caveat } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaDaaaa — Turn Memories Into Magic",
  description:
    "Create personalized surprise invitation pages for the people you love. Beautiful animated reveals for Mother's Day, anniversaries, birthdays, and more.",
  openGraph: {
    title: "TaDaaaa — Turn Memories Into Magic",
    description: "Create beautiful surprise pages for the people you love ✨",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaDaaaa — Turn Memories Into Magic",
    description: "Create beautiful surprise pages for the people you love ✨",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tadaaaa.app"),
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${caveat.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
      {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
        <Script
          defer
          data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
    </html>
  );
}
