"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArchipelagoMap } from "@/components/archipelago-map";
import type { Trail } from "@/lib/types";

/** Home-page map: every summit pin, click to open that trail. */
export function HomeMap({ trails }: { trails: Trail[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string | null>(null);
  return (
    <ArchipelagoMap
      trails={trails}
      island="all"
      selected={selected}
      onSelect={(slug) => {
        setSelected(slug);
        router.push(`/trails/${slug}`);
      }}
      className="aspect-[1000/530]"
    />
  );
}
