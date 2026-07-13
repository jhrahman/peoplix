import { cn } from "@/lib/utils";
import { LOGO_VIEWBOX, LOGO_TAIL_PATH, LOGO_STEM, LOGO_BOWL_PATH } from "@/lib/brand";

// Monogram P with a signature-style flourish tail — the tail nods to
// connected people (HR), rendered in the app's teal/emerald brand gradient.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={cn("size-7 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="peoplix-logo-grad" x1="6" y1="4" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--primary)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id="peoplix-logo-sheen" x1="10" y1="4" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.65" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={LOGO_TAIL_PATH}
        stroke="url(#peoplix-logo-grad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <rect {...LOGO_STEM} fill="url(#peoplix-logo-grad)" />
      <path
        d={LOGO_BOWL_PATH}
        stroke="url(#peoplix-logo-grad)"
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={LOGO_BOWL_PATH}
        stroke="url(#peoplix-logo-sheen)"
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={iconClassName} />
      <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text font-heading text-lg font-semibold tracking-tight text-transparent">
        Peoplix
      </span>
    </span>
  );
}
