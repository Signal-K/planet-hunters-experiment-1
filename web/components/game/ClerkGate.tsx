'use client'

import React, { useEffect } from 'react'
import { ClerkProvider, useAuth, useClerk, useSignIn, useSignUp } from '@clerk/react'
import { clerkPublishableKey, setClerkBridge } from '@/lib/clerk-auth'

// Hands the live Clerk hook objects to lib/clerk-auth, which the auth hook
// calls from outside this tree.
function ClerkBridgeSync() {
  const clerk = useClerk()
  const { isLoaded } = useAuth()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  useEffect(() => {
    if (isLoaded) setClerkBridge({ clerk, signIn, signUp })
  }, [clerk, isLoaded, signIn, signUp])
  useEffect(() => () => setClerkBridge(null), [])
  return null
}

/** Loads Landnam's Clerk instance only while the sign-in sheet is open. */
export default function ClerkGate({ children }: { children: React.ReactNode }) {
  const publishableKey = clerkPublishableKey()
  if (!publishableKey) return <>{children}</>
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkBridgeSync />
      {children}
    </ClerkProvider>
  )
}
