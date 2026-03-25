"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { navItems } from "./NavItems";
import { NavIconSvg } from "./NavIcon";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen bg-[#F2F2F2] border-r border-[#E8E8E8] flex-shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[#E8E8E8]">
        <span className="text-sm font-bold tracking-[0.12em] text-[#183D46] uppercase">
          Hack Log
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                active
                  ? "bg-[rgba(24,61,70,0.08)] text-[#183D46] font-semibold"
                  : "text-[#5C5C5C] hover:bg-[rgba(24,61,70,0.05)] hover:text-[#183D46]"
              }`}
            >
              <span className={active ? "text-[#183D46]" : "text-[#5C5C5C]"}>
                <NavIconSvg icon={icon} size={16} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2.5 py-3 border-t border-[#E8E8E8] space-y-0.5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#5C5C5C] hover:bg-[rgba(24,61,70,0.05)] hover:text-[#183D46] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="8" r="2" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
          </svg>
          設定
        </Link>
        <SignOutButton>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#5C5C5C] hover:bg-[rgba(24,61,70,0.05)] hover:text-[#183D46] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6" />
            </svg>
            ログアウト
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
