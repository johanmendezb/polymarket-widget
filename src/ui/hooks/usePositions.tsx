'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { SimulatedPosition } from '@/domain';

interface PositionsContextValue {
  readonly positions: readonly SimulatedPosition[];
  readonly addPosition: (position: SimulatedPosition) => void;
}

const PositionsContext = createContext<PositionsContextValue | null>(null);

/**
 * Session-only, in-memory position list (T4.5). No storage API of any kind —
 * a sandboxed iframe has none, and a reload clears this on purpose.
 */
export function PositionsProvider({ children }: { readonly children: ReactNode }) {
  const [positions, setPositions] = useState<readonly SimulatedPosition[]>([]);

  const addPosition = useCallback((position: SimulatedPosition) => {
    setPositions((prev) => [position, ...prev]);
  }, []);

  const value = useMemo(() => ({ positions, addPosition }), [positions, addPosition]);

  return <PositionsContext.Provider value={value}>{children}</PositionsContext.Provider>;
}

export function usePositions(): PositionsContextValue {
  const ctx = useContext(PositionsContext);
  if (ctx === null) throw new Error('usePositions must be used within a PositionsProvider');
  return ctx;
}
