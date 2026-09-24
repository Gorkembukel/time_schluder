import { createContext, useContext, type ReactNode } from 'react'

const UidContext = createContext<string | null>(null)

export function UidProvider({ uid, children }: { uid: string; children: ReactNode }) {
  return <UidContext.Provider value={uid}>{children}</UidContext.Provider>
}

/** Oturum açmış kullanıcının uid'i — yalnızca AuthGate/App altında (UidProvider içinde) kullanılabilir. */
export function useUid(): string {
  const uid = useContext(UidContext)
  if (!uid) {
    throw new Error('useUid, UidProvider içinde kullanılmalı')
  }
  return uid
}
