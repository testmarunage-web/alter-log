export const navItems = [
  { href: "/chat?mode=journal", label: "JOURNAL",    shortLabel: "JOURNAL",    icon: "journal" },
  { href: "/dashboard",         label: "SCAN",       shortLabel: "SCAN",       icon: "home"    },
  { href: "/alter-log",         label: "Alter Log",  shortLabel: "Alter Log",  icon: "log"     },
  { href: "/archive",           label: "REPORT",     shortLabel: "REPORT",     icon: "report"  },
] as const;

export type NavIcon = (typeof navItems)[number]["icon"] | "settings";