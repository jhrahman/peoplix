import { addReaction, removeReaction } from "@/lib/engagement-reactions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;
  return addReaction(request, {
    table: "comment_reactions",
    idColumn: "comment_id",
    id: commentId,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;
  return removeReaction(request, {
    table: "comment_reactions",
    idColumn: "comment_id",
    id: commentId,
  });
}
