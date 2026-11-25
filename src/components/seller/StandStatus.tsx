"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type StandStatusCtx = {
  buka: boolean;
  setBuka: (buka: boolean) => void;
};

const StandStatusContext = createContext<StandStatusCtx | null>(null);

export function StandStatusProvider({
  initial,
  children,
}: {
  initial: boolean;
  children: ReactNode;
}) {
  const [buka, setBuka] = useState(initial);
  return (
    <StandStatusContext.Provider value={{ buka, setBuka }}>
      {children}
    </StandStatusContext.Provider>
  );
}

export function useStandStatus(fallback = true) {
  const ctx = useContext(StandStatusContext);
  return ctx ?? { buka: fallback, setBuka: () => {} };
}
