import { createContext, useContext, useState, type ReactNode } from 'react'

export interface Account {
  id: number
  username: string
  email: string
  role: string
  is_blocked: boolean
}

interface AuthCtx {
  token: string | null
  account: Account | null
  signIn: (token: string, account: Account) => void
  signOut: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [account, setAccount] = useState<Account | null>(() => {
    const raw = localStorage.getItem('account')
    return raw ? JSON.parse(raw) : null
  })

  function signIn(t: string, a: Account) {
    setToken(t)
    setAccount(a)
    localStorage.setItem('token', t)
    localStorage.setItem('account', JSON.stringify(a))
  }

  function signOut() {
    setToken(null)
    setAccount(null)
    localStorage.removeItem('token')
    localStorage.removeItem('account')
  }

  return <AuthContext.Provider value={{ token, account, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
