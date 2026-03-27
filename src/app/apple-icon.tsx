import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#0B0E13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24" fill="#C4A35A">
          <path d="M12 2L2 22h20L12 2z" />
        </svg>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
