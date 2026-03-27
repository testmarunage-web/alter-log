import { AlterIcon } from "../_components/AlterIcon";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0E13]">
      <div
        style={{
          animation: "alter-breathe 3s ease-in-out infinite",
        }}
      >
        <AlterIcon size={48} />
      </div>
      <p className="mt-4 text-xs text-[#8A8276]/60 tracking-widest">Now loading...</p>
      <style>{`
        @keyframes alter-breathe {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
