"use client";

import { createContext, useContext, useMemo } from "react";
import type { PersonOption } from "@/lib/types";

type EngagementContextValue = {
  currentUserId: string | null;
  people: PersonOption[];
  nameById: Map<string, string>;
  personById: Map<string, PersonOption>;
  onLeaveToday: Set<string>;
};

const EngagementContext = createContext<EngagementContextValue>({
  currentUserId: null,
  people: [],
  nameById: new Map(),
  personById: new Map(),
  onLeaveToday: new Set(),
});

// Who's who for the whole page, so tag suggestions, tag chips and their hover
// previews (which render deep inside posts and comments) don't need the list
// threaded through props.
export function EngagementProvider({
  currentUserId,
  people,
  onLeaveTodayIds = [],
  children,
}: {
  currentUserId: string;
  people: PersonOption[];
  onLeaveTodayIds?: string[];
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      currentUserId,
      people,
      nameById: new Map(people.map((p) => [p.id, p.full_name])),
      personById: new Map(people.map((p) => [p.id, p])),
      onLeaveToday: new Set(onLeaveTodayIds),
    }),
    [currentUserId, people, onLeaveTodayIds],
  );

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() {
  return useContext(EngagementContext);
}
