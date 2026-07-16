"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AvatarCropDialog } from "@/components/settings/avatar-crop-dialog";
import { updateAvatarUrl } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const MAX_FILE_BYTES = 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function AvatarUpload({ profile }: { profile: Profile }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isBusy = isUploading || isDeleting;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a PNG, JPG, JPEG or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image must be 1MB or smaller.");
      return;
    }

    setSelectedImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
  }

  async function handleCropped(blob: Blob) {
    setIsUploading(true);
    try {
      const supabase = createClient();
      const path = `${profile.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      const bustedUrl = `${publicUrl}?v=${Date.now()}`;

      await updateAvatarUrl(bustedUrl);
      setAvatarUrl(bustedUrl);
      toast.success("Profile photo updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload photo");
    } finally {
      setIsUploading(false);
      if (selectedImageSrc) URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      await supabase.storage.from("avatars").remove([`${profile.id}.jpg`]);
      await updateAvatarUrl(null);
      setAvatarUrl(null);
      toast.success("Profile photo deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete photo");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="group relative">
        <Avatar className="size-32 ring-2 ring-border" size="lg">
          <AvatarImage src={avatarUrl ?? undefined} alt={profile.full_name} className="object-cover" />
          <AvatarFallback className="text-2xl">{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition-all duration-150 hover:bg-black/40 hover:text-white disabled:pointer-events-none"
          aria-label="Upload profile photo"
        >
          {isUploading ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
        >
          {isUploading ? "Uploading..." : avatarUrl ? "Change photo" : "Upload photo"}
        </Button>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isBusy}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            {isDeleting ? "Deleting..." : "Delete photo"}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">PNG, JPG or WEBP. Max 1MB.</p>

      <AvatarCropDialog
        imageSrc={selectedImageSrc}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onCropped={handleCropped}
      />
    </div>
  );
}
