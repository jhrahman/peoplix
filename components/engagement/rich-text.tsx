"use client";

import { useState } from "react";
import { splitMentions, visibleLength } from "@/lib/mentions";
import { cn } from "@/lib/utils";
import { useEngagement } from "@/components/engagement/engagement-context";
import { PersonHoverCard } from "@/components/engagement/person-card";

// Capturing group => String.split keeps the URLs, at the odd indexes.
const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

const CLAMP_CHARS = 420;
const CLAMP_LINES = 7;

function Links({ text }: { text: string }) {
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all text-primary underline-offset-2 hover:underline"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

// Plain text with clickable http(s) links and highlighted @tags. Built from
// React elements (never innerHTML), so user content can't inject markup. A
// tag shows the person's *current* name looked up by id; the name stored in
// the token is only a fallback. Long posts are clamped behind "Show more".
export function RichText({
  text,
  className,
  clamp = true,
}: {
  text: string;
  className?: string;
  clamp?: boolean;
}) {
  const { currentUserId, nameById } = useEngagement();
  const [expanded, setExpanded] = useState(false);
  const isLong = clamp && (visibleLength(text) > CLAMP_CHARS || text.split("\n").length > CLAMP_LINES);

  return (
    <div>
      <p
        className={cn(
          "text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap",
          isLong && !expanded && "line-clamp-6",
          className,
        )}
      >
        {splitMentions(text).map((segment, i) =>
          segment.type === "mention" ? (
            <PersonHoverCard
              key={i}
              personId={segment.id}
              fallbackName={segment.label}
              testId={`mention-${segment.id}`}
              className={cn(
                "rounded-md px-1 py-0.5 font-medium text-primary",
                segment.id === currentUserId ? "bg-primary/25" : "bg-primary/10",
              )}
            >
              @{nameById.get(segment.id) ?? segment.label}
            </PersonHoverCard>
          ) : (
            <Links key={i} text={segment.text} />
          ),
        )}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 cursor-pointer text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
