import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
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
            width: 20,
            height: 4,
            background: "#FFFFFF",
            borderRadius: 2,
            transform: "rotate(45deg)",
          }}
        />
        {/* Bar: top-right → bottom-left */}
        <div
          style={{
            position: "absolute",
            width: 20,
            height: 4,
            background: "#FFFFFF",
            borderRadius: 2,
            transform: "rotate(-45deg)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
