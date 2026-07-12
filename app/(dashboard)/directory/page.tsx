import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/types";
import { DirectoryList } from "@/components/directory/directory-list";

export default async function DirectoryPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name")
    .returns<Profile[]>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team directory</CardTitle>
      </CardHeader>
      <CardContent>
        <DirectoryList profiles={profiles ?? []} />
      </CardContent>
    </Card>
  );
}
