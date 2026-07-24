import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Holiday } from "@/lib/types";

// Holidays are shared, read-heavy, and change rarely - cached the same way
// the directory page caches its profiles query (see app/(dashboard)/directory).
// Writers invalidate via revalidateTag("holidays-list", { expire: 0 }).
export const getHolidaysList = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from("holidays")
      .select("*")
      .order("date")
      .returns<Holiday[]>();
    return data ?? [];
  },
  ["holidays-list"],
  { revalidate: 300, tags: ["holidays-list"] },
);
