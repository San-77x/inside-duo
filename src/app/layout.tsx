import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Load any URL inside a true-to-size iPhone Duo frame. Fold between the cover and inner displays, rotate, and share the exact view.";

// Needed for og:image to resolve to an absolute URL. Override per environment rather than
// editing this, so a preview deploy does not advertise the production host.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://inside-duo.sidecraft.workers.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "View on iPhone Duo",
  description,
  openGraph: {
    type: "website",
    siteName: "View on iPhone Duo",
    title: "View on iPhone Duo",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "View on iPhone Duo",
    description,
  },
};

// Cloudflare Web Analytics. Public by design — it is visible in the page source — so it
// lives in .env.local rather than a secret store. Absent token means no script at all,
// which keeps local development and forks free of any beacon.
const beaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {beaconToken && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={JSON.stringify({ token: beaconToken })}
          />
        )}
      </body>
    </html>
  );
}
