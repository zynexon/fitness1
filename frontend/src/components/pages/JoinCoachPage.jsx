import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import branding from '../../config/branding'

function JoinCoachPage({ activeWarriorsCount, handleAuthSubmit, authLoading, errorText, nameInput, setNameInput, emailInput, setEmailInput, passwordInput, setPasswordInput, setAuthMode }) {
  const { code } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [coachName, setCoachName] = useState('')

  useEffect(() => {
    async function checkCode() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coach/invite/${code}/preview/`)
        if (res.ok) {
          const data = await res.json()
          setValid(data.valid)
          setCoachName(data.coach_name)
        } else {
          setValid(false)
        }
      } catch (err) {
        setValid(false)
      } finally {
        setLoading(false)
      }
    }
    checkCode()
  }, [code])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-lg flex-col px-5 pt-8 pb-6 justify-center text-center">
        <p className="text-sm font-semibold text-zinc-500">Verifying invite...</p>
      </main>
    )
  }

  if (!valid) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-lg flex-col px-5 pt-8 pb-6 justify-center text-center">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-xl font-black text-zinc-900 mb-2">Invalid Invite Link</h2>
          <p className="text-sm font-semibold text-zinc-500 mb-6">
            This invite link is invalid or has expired. Please ask your coach for a new one.
          </p>
          <button
            onClick={() => {
              setAuthMode('login')
              navigate('/')
            }}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
          >
            Go to Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-lg flex-col px-5 pt-8 pb-6">
      <div className="mb-8 mt-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-1">
          {branding.copyPack.landingPageCopy.navBrand}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">
          Join {coachName}'s Team
        </h1>
        <p className="text-sm font-semibold text-zinc-400">
          Create your account to connect with your coach.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">
        <form
          onSubmit={(e) => {
            handleAuthSubmit(e, code)
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Name
            </label>
            <input
              type="text"
              required
              autoFocus
              className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
              placeholder="Your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
              placeholder="name@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-zinc-500">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-900 focus:bg-white"
              placeholder="••••••••"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
            />
          </div>

          {errorText && (
            <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl mt-2">
              {errorText}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="mt-4 w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {authLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center border-t border-zinc-200 pt-6">
        <p className="text-xs font-semibold text-zinc-500 mb-3">
          Already have an account?
        </p>
        <button
          type="button"
          onClick={() => {
            setAuthMode('login')
            navigate('/')
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50"
        >
          Log in instead
        </button>
      </div>
    </main>
  )
}

export default JoinCoachPage
