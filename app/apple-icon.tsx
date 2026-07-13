import { ImageResponse } from "next/og";
import { LOGO_VIEWBOX, LOGO_TAIL_PATH, LOGO_STEM, LOGO_BOWL_PATH } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14b8a6, #0b6b64)",
        }}
      >
        <svg viewBox={LOGO_VIEWBOX} width={112} height={112} fill="none">
          <path d={LOGO_TAIL_PATH} stroke="white" strokeWidth="5" strokeLinecap="round" />
          <rect {...LOGO_STEM} fill="white" />
          <path d={LOGO_BOWL_PATH} stroke="white" strokeWidth="7.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
