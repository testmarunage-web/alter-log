"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutLink() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
      className="text-xs text-[#8A8276]/30 hover:text-[#8A8276]/60 transition-colors"
    >
      別のアカウントでログイン
    </button>
  );
}
