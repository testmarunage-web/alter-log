import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#0B0E13",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="300" height="300" viewBox="0 0 24 24" fill="#C4A35A">
          <path d="M12 2L2 22h20L12 2z" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
