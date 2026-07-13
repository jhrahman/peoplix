import { cn } from "@/lib/utils";
import { LOGO_VIEWBOX, LOGO_TAIL_PATH, LOGO_STEM, LOGO_BOWL_PATH } from "@/lib/brand";

// Monogram P with a signature-style flourish tail — the tail nods to
// connected people (HR), rendered in the app's teal/emerald brand gradient.
export function LogoMark({ className, id = "default" }: { className?: string; id?: string }) {
  // Gradient ids must be unique per <svg> instance — the sidebar and mobile
  // navbar logos both render in the DOM at once (one just CSS-hidden), and
  // duplicate ids make url(#...) references resolve to whichever instance
  // came first, silently breaking the other one's fill/stroke.
  const gradId = `peoplix-logo-grad-${id}`;
  const sheenId = `peoplix-logo-sheen-${id}`;

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={cn("size-7 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--primary)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id={sheenId} x1="10" y1="4" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.65" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={LOGO_TAIL_PATH}
        stroke={`url(#${gradId})`}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <rect {...LOGO_STEM} fill={`url(#${gradId})`} />
      <path
        d={LOGO_BOWL_PATH}
        stroke={`url(#${gradId})`}
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={LOGO_BOWL_PATH}
        stroke={`url(#${sheenId})`}
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({
  className,
  iconClassName,
  id = "default",
}: {
  className?: string;
  iconClassName?: string;
  id?: string;
}) {
  return (
    <span className={cn("flex items-center", className)}>
      <LogoMark className={cn("-mr-[9px]", iconClassName)} id={id} />
      <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text font-heading text-lg font-semibold tracking-tight text-transparent">
        eoplix
      </span>
    </span>
  );
}
