export default function ChatLoading() {
  return (
    <>
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes orb-glow {
          0%, 100% { box-shadow: 0 0 14px rgba(58,175,202,0.45), 0 0 4px rgba(147,228,212,0.30); }
          50%       { box-shadow: 0 0 28px rgba(58,175,202,0.75), 0 0 10px rgba(147,228,212,0.55); }
        }
      `}</style>
      <div className="bg-[#0B0E13] min-h-screen flex items-center justify-center">
        <div
          className="w-11 h-11 rounded-full relative overflow-hidden"
          style={{
            background: "radial-gradient(circle at 38% 38%, #93E4D4, #3AAFCA 45%, #1A6B8A)",
            animation: "orb-pulse 2s ease-in-out infinite, orb-glow 2s ease-in-out infinite",
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at 62% 28%, rgba(255,255,255,0.40), transparent 55%)",
            }}
          />
        </div>
      </div>
    </>
  );
}
