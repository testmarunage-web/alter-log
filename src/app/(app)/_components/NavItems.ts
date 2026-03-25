export const navItems = [
  { href: "/dashboard", label: "ホーム",          shortLabel: "ホーム",   icon: "home"    },
  { href: "/chat",      label: "セッション",       shortLabel: "セッション", icon: "chat"   },
  { href: "/reports",  label: "振り返り",          shortLabel: "振り返り", icon: "reports" },
  { href: "/archive",  label: "あなたの記録",       shortLabel: "記録",     icon: "profile" },
] as const;

export type NavIcon = (typeof navItems)[number]["icon"];
