"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { signInWithGoogle } from "../actions"

function LoginContent() {
  const searchParams = useSearchParams()
  const hasError = searchParams.get("error") === "auth_failed"

  async function handleSignIn() {
    const result = await signInWithGoogle()
    if (result.success) {
      window.location.href = result.data.url
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-tt-bg-page">
      <div className="w-full max-w-[480px] px-6 text-center">
        <h1 className="mb-8 text-3xl font-bold text-tt-text-primary">
          TimeTap
        </h1>

        {hasError && (
          <div className="mb-6 rounded-lg bg-tt-error-light p-4 text-tt-error">
            Something went wrong with Google. Try again?
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="w-full rounded-lg bg-gradient-to-r from-tt-primary to-[#00c6fb] px-6 py-3 text-lg font-semibold text-white shadow-md transition hover:opacity-90"
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
