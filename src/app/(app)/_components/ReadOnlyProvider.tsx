"use client";

import { createContext, useContext } from "react";

interface ReadOnlyContextValue {
  isReadOnly: boolean;
  showRefundNotice: boolean;
}

const ReadOnlyContext = createContext<ReadOnlyContextValue>({
  isReadOnly: false,
  showRefundNotice: false,
});

export function ReadOnlyProvider({
  children,
  isReadOnly,
  showRefundNotice = false,
}: {
  children: React.ReactNode;
  isReadOnly: boolean;
  showRefundNotice?: boolean;
}) {
  return (
    <ReadOnlyContext.Provider value={{ isReadOnly, showRefundNotice }}>
      {children}
    </ReadOnlyContext.Provider>
  );
}

export function useReadOnly() {
  return useContext(ReadOnlyContext).isReadOnly;
}

export function useShowRefundNotice() {
  return useContext(ReadOnlyContext).showRefundNotice;
}
