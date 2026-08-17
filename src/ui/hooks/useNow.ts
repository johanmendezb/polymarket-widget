'use client';

import { useEffect, useState } from 'react';

/**
 * The current epoch ms, re-rendered on an interval. Used only to drive
 * freshness stamps ("updated 3s ago"); never fed into `aria-live`, since
 * routine ticks must announce nothing (USER_FLOWS.md State C).
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
