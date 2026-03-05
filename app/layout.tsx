import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import { ViewingAsBanner } from "@/components/layout/ViewingAsBanner";
import { SharedContextProvider } from "@/components/SharedContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOG WealthFlow — Jeevitha's Family Finance",
  description: "Personal finance tracker based on Ramit Sethi methodology",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
          <SharedContextProvider>
            <Header />
            <ViewingAsBanner />
            <main className="pb-20">{children}</main>
          </SharedContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
