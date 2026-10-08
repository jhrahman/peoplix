import Link from "next/link";
import { ArrowLeft, FileX } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getPeople } from "@/lib/engagement-people";
import { getEmployeeIdsOnApprovedLeave } from "@/lib/leave";
import { todayInDhaka } from "@/lib/attendance";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPost } from "@/lib/engagement";
import { Card, CardContent } from "@/components/ui/card";
import { SinglePost } from "@/components/engagement/single-post";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SinglePostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ comment?: string }>;
}) {
  const { id } = await params;
  const { comment } = await searchParams;
  const { supabase, user, profile } = await getCurrentProfile();

  // The dashboard layout redirects to /login in this case.
  if (!user || !profile) return null;

  // A notification can outlive its post (deleted by the author or an Admin),
  // so a missing post is a friendly message rather than a 404 page.
  const post = UUID_PATTERN.test(id) ? await fetchPost(supabase, user.id, id) : null;

  if (!post) {
    return (
      <Card className="mx-auto max-w-lg" data-testid="single-post-missing">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <FileX className="size-7 text-muted-foreground/70" />
          <p className="font-medium">This post is no longer available</p>
          <p className="text-sm text-muted-foreground">It may have been deleted.</p>
          <Link
            href="/engagement"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to feed
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <SinglePost
      initialPost={post}
      currentUser={{
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      }}
      people={(await getPeople()).map(({ id, full_name, email, designation, avatar_url }) => ({
        id,
        full_name,
        email,
        designation,
        avatar_url,
      }))}
      onLeaveTodayIds={await getEmployeeIdsOnApprovedLeave(createAdminClient(), todayInDhaka())}
      highlightCommentId={comment && UUID_PATTERN.test(comment) ? comment : undefined}
    />
  );
}
