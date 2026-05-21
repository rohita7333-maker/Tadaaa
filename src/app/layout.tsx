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
      {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
        <Script id="posthog-init" strategy="afterInteractive">
          {`
            (function() {
              var KEY = ${JSON.stringify(process.env.NEXT_PUBLIC_POSTHOG_KEY)};
              var HOST = ${JSON.stringify(process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com")};

              function loadPosthog() {
                if (window.__phLoaded) return;
                window.__phLoaded = true;
                // Official PostHog browser snippet (verbatim from posthog.com docs)
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init Ee Ss Re ws ks Es xs Is Ps As Cs Ts $s Os Ms js Ds Ls Ns Bs qs Hs Us zs Ws Gs Js Vs Ys Ks Zs Xs Qs er tr nr or sr rr ar ir lr cr ur dr hr fr pr gr mr vr yr br _r wr Sr kr Er xr Ir Pr Ar".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                window.posthog.init(KEY, {
                  api_host: HOST,
                  person_profiles: "identified_only",
                  capture_pageview: true,
                  capture_pageleave: true,
                });
              }

              try {
                if (typeof window === "undefined" || typeof localStorage === "undefined") return;
                if (localStorage.getItem("tadaaaa.cookies") === "ok") {
                  loadPosthog();
                } else {
                  window.addEventListener("cookies.accepted", loadPosthog, { once: true });
                }
              } catch (e) {
                // SSR / sandboxed contexts where localStorage throws — just skip.
              }
            })();
          `}
        </Script>
      )}
    </html>
  );
}
