import { ImageResponse } from "next/og";
import { LOGO_VIEWBOX, LOGO_TAIL_PATH, LOGO_STEM, LOGO_BOWL_PATH } from "@/lib/brand";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #0f2a28, #083733 60%, #0b6b64)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "linear-gradient(135deg, #14b8a6, #0b6b64)",
            marginBottom: 40,
          }}
        >
          <svg viewBox={LOGO_VIEWBOX} width={72} height={72} fill="none">
            <path d={LOGO_TAIL_PATH} stroke="white" strokeWidth="5" strokeLinecap="round" />
            <rect {...LOGO_STEM} fill="white" />
            <path d={LOGO_BOWL_PATH} stroke="white" strokeWidth="7.5" strokeLinecap="round" />
          </svg>
        </div>
        <span style={{ color: "white", fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
          Peoplix
        </span>
        <span style={{ color: "#a7d9d4", fontSize: 32, marginTop: 16 }}>
          People management, simplified.
        </span>
      </div>
    ),
    { ...size },
  );
}
