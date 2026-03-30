import { BarChart2, Mic } from "lucide-react";
import type { NavIcon } from "./NavItems";
import { AlterIcon } from "./AlterIcon";

export function NavIconSvg({ icon, size = 20 }: { icon: NavIcon; size?: number }) {
  const lucideProps = { size, strokeWidth: 1.6 };

  switch (icon) {
    case "home":
      return <BarChart2 {...lucideProps} />;
    case "journal":
      return <Mic {...lucideProps} />;
    case "log":
      return <AlterIcon size={size} />;
  }
}
