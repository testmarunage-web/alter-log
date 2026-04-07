import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LPClient from "./LPClient";

export const metadata: Metadata = {
  title: "Alter Log | 究極の客観視で、自分を知る。",
  description: "AIがあなたの思考を観察し、毎晩密かに観察日記を書く。自分では気づけない認知の歪みやパターンを可視化する、新しいジャーナリング体験。",
  openGraph: {
    title: "Alter Log | 究極の客観視で、自分を知る。",
    description: "AIがあなたの思考を観察し、毎晩密かに観察日記を書く。自分では気づけない認知の歪みやパターンを可視化する、新しいジャーナリング体験。",
    siteName: "Alter Log",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alter Log | 究極の客観視で、自分を知る。",
    description: "AIがあなたの思考を観察し、毎晩密かに観察日記を書く。自分では気づけない認知の歪みやパターンを可視化する、新しいジャーナリング体験。",
  },
};

// AlterIcon は他の多くのページで import されているため export を維持
export function AlterIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="#C9A84C" strokeWidth="0.8" opacity="0.45" />
      <circle cx="12" cy="12" r="4" fill="#C9A84C" opacity="0.65" />
      <circle cx="12" cy="12" r="1.5" fill="#050507" />
    </svg>
  );
}

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/chat?mode=journal");

  return <LPClient />;
}
