import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Science Diagram Maker | Udhi Technologies",
  description: "AI-generated animated science diagrams with 5-stage automated code checks and reviewer approval.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
