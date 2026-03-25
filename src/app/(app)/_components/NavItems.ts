export const navItems = [
  { href: "/dashboard", label: "ホーム",          shortLabel: "ホーム",   icon: "home"    },
  { href: "/chat",      label: "セッション",       shortLabel: "セッション", icon: "chat"   },
  { href: "/reports",  label: "振り返り",          shortLabel: "振り返り", icon: "reports" },
  { href: "/profile",  label: "あなたの取扱説明書", shortLabel: "説明書",   icon: "profile" },
] as const;

export type NavIcon = (typeof navItems)[number]["icon"];
