"use client";

import * as React from "react";

/**
 * State persisted to localStorage, safe for server rendering.
 *
 * The initial render always uses `initial` so server and client markup match;
 * the stored value is read once on mount. Parse failures fall back rather than
 * throwing, so a corrupt entry can never break a page a hiker needs offline.
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return;
      const parsed = JSON.parse(raw) as T;
      setValue((current) =>
        parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
          ? { ...(current as object), ...(parsed as object) } as T
          : parsed
      );
    } catch {
      /* keep the fallback */
    }
  }, [key]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — persistence is best-effort */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
