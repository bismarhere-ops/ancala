"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TrailFilter() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const sort = params.get("sort") ?? "popular";

  const [query, setQuery] = React.useState(q);

  // Debounce text updates
  React.useEffect(() => {
    const id = setTimeout(() => {
      if (query === q) return;
      const sp = new URLSearchParams(params.toString());
      query ? sp.set("q", query) : sp.delete("q");
      router.replace(`/trails?${sp.toString()}`);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (!value || value === "all") sp.delete(key);
    else sp.set(key, value);
    router.replace(`/trails?${sp.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or region"
          className="pl-9"
        />
      </div>
      <Select value={difficulty || "all"} onValueChange={(v) => update("difficulty", v)}>
        <SelectTrigger className="md:w-[200px]">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All difficulties</SelectItem>
          <SelectItem value="easy">Easy</SelectItem>
          <SelectItem value="moderate">Moderate</SelectItem>
          <SelectItem value="hard">Hard</SelectItem>
          <SelectItem value="expert">Expert</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => update("sort", v)}>
        <SelectTrigger className="md:w-[200px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="popular">Most popular</SelectItem>
          <SelectItem value="distance">Shortest first</SelectItem>
          <SelectItem value="elevation">Lowest elevation</SelectItem>
          <SelectItem value="time">Quickest</SelectItem>
          <SelectItem value="name">Name (A–Z)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
