import { ImageResponse } from "next/og";

export const alt = "TaDaaaa — Turn Memories Into Magic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #FAF9F6 0%, #F5E6E0 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(62,107,92,0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(138,111,53,0.1)",
          }}
        />

        {/* Heart icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #3E6B5C 0%, #2E5145 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#1A1B18",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          TaDaaaa
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#6F6E68",
            textAlign: "center",
            maxWidth: 600,
          }}
        >
          Turn Memories Into Magic ✨
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#3E6B5C",
            fontWeight: 600,
          }}
        >
          Beautiful surprise pages for the people you love
        </div>
      </div>
    ),
    { ...size }
  );
}
