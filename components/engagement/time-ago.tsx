import { formatDistanceToNowStrict } from "date-fns";
import { formatDateTime } from "@/lib/datetime";

// "5 minutes ago", with the exact Dhaka-time stamp on hover. The relative
// text depends on the current clock, so the server-rendered and hydrated
// strings can legitimately differ by a tick - hence suppressHydrationWarning.
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className} suppressHydrationWarning>
      {formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}
    </time>
  );
}
