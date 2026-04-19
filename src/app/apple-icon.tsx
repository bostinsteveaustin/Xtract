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
          borderRadius: 40,
          background: "#FB3970",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Bar: top-left → bottom-right */}
        <div
          style={{
            position: "absolute",
            width: 112,
            height: 22,
            background: "#FFFFFF",
            borderRadius: 11,
            transform: "rotate(45deg)",
          }}
        />
        {/* Bar: top-right → bottom-left */}
        <div
          style={{
            position: "absolute",
            width: 112,
            height: 22,
            background: "#FFFFFF",
            borderRadius: 11,
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
