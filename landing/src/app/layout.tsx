import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PostHogProvider } from "./providers";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://flowtour.vercel.app";

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FlowTour — Turn Web App Clicks into Interactive Demos & 4K Auto-Zoom Videos",
    template: "%s | FlowTour",
  },
  description:
    "Zero-backend Chrome Extension for interactive product walkthroughs & Screen Studio-style auto-zoomed 4K 60fps video trailers. Export React + Tailwind code or 3KB vanilla embed scripts.",
  keywords: [
    "Interactive Demos",
    "Product Walkthrough Generator",
    "Screen Studio Alternative",
    "Chrome Extension",
    "WebCodecs 4K Recording",
    "React Component Exporter",
    "No-Code Product Tours",
    "Micro-SaaS Marketing",
  ],
  authors: [{ name: "Naveen Guru", url: "https://github.com/Naveen071110" }],
  creator: "Naveen Guru",
  publisher: "FlowTour",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "FlowTour — Turn Web App Clicks into Interactive Demos & 4K Auto-Zoom Videos",
    description:
      "Zero-backend Chrome Extension for interactive product walkthroughs & 4K 60fps video trailers. 100% local IndexedDB privacy & zero vendor lock-in.",
    siteName: "FlowTour",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "FlowTour — Interactive Product Demo & 4K Auto-Zoom Video Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowTour — Turn Web App Clicks into Interactive Demos & 4K Auto-Zoom Videos",
    description:
      "Screen Studio-style auto-zoomed 4K 60fps video trailers & self-hosted React code exports directly in Chrome.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@NaveenGuru",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: `${siteUrl}/site.webmanifest`,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FlowTour",
  operatingSystem: "Google Chrome, Brave, Arc, Edge (Manifest V3)",
  applicationCategory: "DeveloperApplication",
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      name: "Community Free",
    },
    {
      "@type": "Offer",
      price: "19",
      priceCurrency: "USD",
      name: "Pro Lifetime",
    },
  ],
  description:
    "Chrome extension to capture web app clicks and generate interactive step-by-step walkthroughs and auto-zoomed 4K video trailers.",
  url: siteUrl,
  author: {
    "@type": "Person",
    name: "Naveen Guru",
    url: "https://github.com/Naveen071110",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-background text-slate-100 antialiased selection:bg-brand-violet selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
