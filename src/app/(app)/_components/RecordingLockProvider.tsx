"use client";

import { createContext, useContext, useState } from "react";

interface RecordingLockContextValue {
  navLocked: boolean;
  setNavLocked: (locked: boolean) => void;
}

const RecordingLockContext = createContext<RecordingLockContextValue>({
  navLocked: false,
  setNavLocked: () => {},
});

export function RecordingLockProvider({ children }: { children: React.ReactNode }) {
  const [navLocked, setNavLocked] = useState(false);
  return (
    <RecordingLockContext.Provider value={{ navLocked, setNavLocked }}>
      {children}
    </RecordingLockContext.Provider>
  );
}

export function useRecordingLock() {
  return useContext(RecordingLockContext);
}
