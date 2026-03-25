"use client";

import { useState } from "react";

interface Item {
  title: string;
  catchphrase: string;
  detail: string;
  accent: string;
  labelColor: string;
}

export function ProfileAccordion({ items }: { items: Item[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map(({ title, catchphrase, detail, accent, labelColor }, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={title} className={`border rounded-2xl overflow-hidden transition-all ${accent}`}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
            >
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>
                  {title}
                </p>
                <p className="text-sm font-semibold text-[#E8E3D8]">{catchphrase}</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#9A9488"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-5 pb-5">
                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-[#9A9488] leading-relaxed">{detail}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
