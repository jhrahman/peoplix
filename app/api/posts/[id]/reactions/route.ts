import { addReaction, removeReaction } from "@/lib/engagement-reactions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return addReaction(request, { table: "post_reactions", idColumn: "post_id", id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return removeReaction(request, { table: "post_reactions", idColumn: "post_id", id });
}
