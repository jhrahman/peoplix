"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { CopyEmailButton } from "@/components/directory/copy-email-button";

type DirectoryProfile = Pick<
  Profile,
  "id" | "full_name" | "designation" | "department" | "email" | "phone" | "avatar_url"
>;

export function DirectoryList({ profiles }: { profiles: DirectoryProfile[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      [p.full_name, p.department, p.designation, p.email]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q)),
    );
  }, [profiles, query]);

  if (profiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="directory-empty">
        No employees yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, department, designation, email..."
          className="pl-8 pr-8"
          data-testid="directory-search-input"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            data-testid="directory-search-clear"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="directory-empty">
          No employees match your search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((profile) => (
                <TableRow key={profile.id} data-testid={`directory-row-${profile.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar size="sm">
                        <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{profile.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{profile.designation ?? "—"}</TableCell>
                  <TableCell>{profile.department ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <a
                        href={`mailto:${profile.email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {profile.email}
                      </a>
                      <CopyEmailButton email={profile.email} />
                    </div>
                  </TableCell>
                  <TableCell>
                    {profile.phone ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {profile.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
