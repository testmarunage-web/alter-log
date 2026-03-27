import { Suspense } from "react";
import { Sidebar } from "./_components/Sidebar";
import { BottomNav } from "./_components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0B0E13] overflow-hidden">
      {/* PC: 左サイドバー */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>

      {/* スマホ: ボトムナビ */}
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
