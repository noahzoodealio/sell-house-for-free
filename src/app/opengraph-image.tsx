import { ImageResponse } from "next/og";

export const alt =
  "Sell Your House Free, keep 100% of your sale proceeds";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0653ab",
          color: "#ffffff",
          padding: "80px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          Sell Your House Free
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 32,
            fontWeight: 500,
            opacity: 0.9,
            textAlign: "center",
          }}
        >
          Keep 100% of your sale proceeds, Arizona
        </div>
      </div>
    ),
    { ...size },
  );
}
