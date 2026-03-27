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
    case "archive":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M5 8v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8" />
          <path d="M8 12h4" />
        </svg>
      );
    case "log":
      return <AlterIcon size={size} />;
  }
}
