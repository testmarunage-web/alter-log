"use client";

import { createContext, useContext } from "react";

const ReadOnlyContext = createContext(false);

export function ReadOnlyProvider({
  children,
  isReadOnly,
}: {
  children: React.ReactNode;
  isReadOnly: boolean;
}) {
  return (
    <ReadOnlyContext.Provider value={isReadOnly}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useReadOnly() {
  return useContext(ReadOnlyContext);
}
