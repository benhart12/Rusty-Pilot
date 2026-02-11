// ============================================================
// RustyPilot Refresh — Root Layout
// Shared across all routes in the App Router.
// ============================================================

import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import ToastContainer from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "RustyPilot Refresh",
  description:
    "A preflight briefing for your brain. Interactive study plans and drills for pilots returning to the cockpit.",
  keywords: ["pilot", "BFR", "IPC", "rust removal", "study plan", "aviation training"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <ToastProvider>
          <ToastContainer />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}