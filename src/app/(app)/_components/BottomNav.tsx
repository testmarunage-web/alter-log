"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./NavItems";
import { NavIconSvg } from "./NavIcon";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#E8E8E8]">
      <div className="flex items-stretch">
        {navItems.map(({ href, shortLabel, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 pb-safe transition-colors ${
                active ? "text-[#183D46]" : "text-[#B0B0B0]"
              }`}
            >
              <NavIconSvg icon={icon} size={22} />
              <span
                className={`text-[9px] leading-none ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {shortLabel}
              </span>
              {active && (
                <span className="absolute top-0 inset-x-0 mx-auto w-8 h-0.5 bg-[#183D46] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
