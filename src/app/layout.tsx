import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Opmaint CMMS • Permit to Work (PTW)",
  description:
    "Safety-critical Permit to Work module for hazardous plant operations. Built for Opmaint CMMS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs text-center">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white">Opmaint CMMS</span>
                <span>• Industrial Plant Safety & Permit-to-Work Engine</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                PostgreSQL • State Machine Guard • OSHA / PESO Compliant
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
