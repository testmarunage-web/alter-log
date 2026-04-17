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
        <svg width="130" height="130" viewBox="0 0 512 512">
          <path d="M356,83 A200,200 0 1,0 456,256 L356,83 Z" fill="#C4A35A" />
        </svg>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
