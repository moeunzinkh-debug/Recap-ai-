import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ProcessingBanner from "@/components/ProcessingBanner";

export const metadata: Metadata = {
  title: {
    default: "ស្គ្រីបសម្រាយរឿង — Anime & Movie Recap Script Generator",
    template: "%s — ស្គ្រីបសម្រាយរឿង",
  },
  description:
    "បង្កើតស្គ្រីបសម្រាយរឿងជាភាសាខ្មែរពីវីដេអូ ដោយប្រើ Gemini AI — គាំទ្រវីដេអូរហូតដល់ 10 នាទី និង 100MB។",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="km">
      <body className="min-h-screen bg-[#0b0d14] text-slate-200 antialiased">
        <Navbar />
        <ProcessingBanner />
        {children}
        <footer className="border-t border-slate-800/70 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-left">
            <p>
              🎬 ស្គ្រីបសម្រាយរឿង — ដំណើរការដោយ Gemini AI • វិភាគ Frames ពីវីដេអូ
            </p>
            <p>
              គាំទ្រ៖ វីដេអូរហូតដល់ 10 នាទី • 100MB • ស្គ្រីបខ្មែរ 100%
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
