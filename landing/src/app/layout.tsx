import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PostHogProvider } from "./providers";

export const viewport: Viewport = {
  themeColor: "#090D16",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "FlowTour | Turn App Clicks into Interactive Demos & Auto-Zoom Videos",
  description:
    "The zero-backend Chrome extension that captures your web app workflow, exports auto-zoomed 60fps MP4 trailers, and generates zero-dependency React/Tailwind landing page widgets.",
  keywords: [
    "Chrome Extension",
    "Screen Studio alternative",
    "Interactive Product Walkthrough",
    "Auto-zoom video generator",
    "Self-hosted tour guide",
    "React tour component",
    "Product demo recorder",
  ],
  authors: [{ name: "Naveen Guru" }],
  openGraph: {
    title: "FlowTour | 1-Click Interactive Tours & Auto-Zoom MP4 Videos",
    description:
      "Capture your web app workflow in Chrome, export auto-zoomed 60fps MP4s, or copy lightweight React code for your SaaS landing page.",
    url: "https://flowtour.dev",
    siteName: "FlowTour",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowTour | 1-Click Interactive Tours & Auto-Zoom Videos",
    description:
      "Self-hosted, auto-zooming demo engine for developers. $0 monthly fees.",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.png",
    apple: "/icon.png",
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
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
