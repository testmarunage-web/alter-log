import { Home, Mic, MessagesSquare } from "lucide-react";
import type { NavIcon } from "./NavItems";
import { AlterIcon } from "./AlterIcon";

export function NavIconSvg({ icon, size = 20 }: { icon: NavIcon; size?: number }) {
  const lucideProps = { size, strokeWidth: 1.6 };

  switch (icon) {
    case "home":
      return <Home {...lucideProps} />;
    case "journal":
      return <Mic {...lucideProps} />;
    case "coach":
      return <MessagesSquare {...lucideProps} />;
    case "log":
      return <AlterIcon size={size} />;
  }
}
