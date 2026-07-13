import { ImageResponse } from "next/og";
import { LOGO_VIEWBOX, LOGO_TAIL_PATH, LOGO_STEM, LOGO_BOWL_PATH } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <svg viewBox={LOGO_VIEWBOX} width={22} height={22} fill="none">
          <path d={LOGO_TAIL_PATH} stroke="white" strokeWidth="5" strokeLinecap="round" />
          <rect {...LOGO_STEM} fill="white" />
          <path d={LOGO_BOWL_PATH} stroke="white" strokeWidth="7.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
