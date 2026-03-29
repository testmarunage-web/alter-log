"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { navItems } from "./NavItems";
import { NavIconSvg } from "./NavIcon";

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(href: string) {
    const [hrefPath, hrefQuery] = href.split("?");
    if (pathname !== hrefPath && !pathname.startsWith(hrefPath + "/")) return false;
    if (!hrefQuery) return true;
    const hrefParams = new URLSearchParams(hrefQuery);
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0E13]/95 backdrop-blur-md border-t border-[#C4A35A]/10">
      <div className="flex items-stretch">
        {navItems.map(({ href, shortLabel, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 pb-safe transition-colors relative ${
                active ? "text-[#C4A35A]" : "text-[#8A8276]"
              }`}
            >
              <NavIconSvg icon={icon} size={22} />
              <span
                className={`text-[8px] leading-none whitespace-nowrap ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {shortLabel}
              </span>
              {active && (
                <span
                  className="absolute top-0 inset-x-0 mx-auto w-8 h-0.5 bg-[#C4A35A] rounded-full"
                  style={{ boxShadow: "0 0 8px rgba(196,163,90,0.5)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
