"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, History, Home, KeyRound, Wand2 } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "ទំព័រដើម", icon: Home },
    { href: "/history", label: "ប្រវត្តិស្គ្រីប", icon: History },
    { href: "/settings", label: "API Keys", icon: KeyRound },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0b0d14]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-red-500 shadow-[0_4px_20px_rgba(245,158,11,0.4)]">
            <Clapperboard className="h-5 w-5 text-slate-950" />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold text-white">ស្គ្រីបសម្រាយរឿង</span>
            <span className="block text-[11px] font-medium tracking-wide text-amber-400/90">
              Recap Script Studio
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <span className="ml-1 hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 px-3.5 py-2 text-sm font-bold text-slate-950 sm:inline-flex">
            <Wand2 className="h-4 w-4" /> Gemini AI
          </span>
        </nav>
      </div>
    </header>
  );
}
