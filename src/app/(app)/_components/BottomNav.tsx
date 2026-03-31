"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navItems } from "./NavItems";
import { NavIconSvg } from "./NavIcon";

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (current <= 10) {
        setVisible(true);
      } else if (current < lastScrollY.current) {
        setVisible(true);
      } else if (current > lastScrollY.current + 4) {
        setVisible(false);
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const settingsActive = pathname === "/settings";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0E13]/95 backdrop-blur-md border-t border-[#C4A35A]/10"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
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
                className={`leading-none ${active ? "font-bold" : "font-medium"}`}
                style={{ fontSize: "7.5px", letterSpacing: "-0.03em", whiteSpace: "nowrap" }}
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

        {/* 設定アイコン（ラベルなし・控えめ） */}
        <Link
          href="/settings"
          className={`w-12 flex flex-col items-center justify-center py-2.5 pb-safe transition-colors relative ${
            settingsActive ? "text-[#C4A35A]/70" : "text-[#8A8276]/50"
          }`}
        >
          <NavIconSvg icon="settings" size={18} />
          {settingsActive && (
            <span
              className="absolute top-0 inset-x-0 mx-auto w-6 h-0.5 bg-[#C4A35A]/60 rounded-full"
              style={{ boxShadow: "0 0 6px rgba(196,163,90,0.3)" }}
            />
          )}
        </Link>
      </div>
    </nav>
  );
}
