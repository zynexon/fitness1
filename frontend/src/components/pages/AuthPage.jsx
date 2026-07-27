import branding, { interpolate } from '../../config/branding'

function AuthPage({
  authMode,
  setAuthMode,
  handleAuthSubmit,
  authLoading,
  authNotice = '',
  nameInput,
  setNameInput,
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  setResetPasswordToken,
  resetPasswordConfirmInput,
  setResetPasswordConfirmInput,
  errorText,
  activeWarriorsCount,
  guestScore = null,
}) {
  const isLoginMode = authMode === 'login'
  const isForgotMode = authMode === 'forgot_password'
  const isResetMode = authMode === 'reset_password'

  const submitLabel = authLoading
    ? 'Please wait...'
    : isForgotMode
        ? 'Send Reset Link'
        : isResetMode
          ? 'Set New Password'
          : branding.copyPack.authPageCopy.submitLabel

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md lg:max-w-lg flex-col px-5 pt-5 pb-6">
      <section className="rounded-[2rem] border border-zinc-800 bg-zinc-950 px-5 py-6 lg:px-8 lg:py-8 text-center text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] animate-[fadeIn_0.6s_ease]">
        <div className="text-4xl font-black tracking-[0.18em] text-white">{branding.copyPack.authPageCopy.heroTitle}</div>
        <p className="mt-2 text-[10px] lg:text-xs font-black uppercase tracking-[0.28em] text-zinc-400">{branding.copyPack.authPageCopy.heroTagline}</p>

        <h1 className="mt-5 text-2xl font-bold text-white">{branding.copyPack.authPageCopy.heroHeading}</h1>
        <p className="mt-2 text-zinc-300">{branding.copyPack.authPageCopy.heroSubHeading}</p>

        <p className="mt-5 text-base font-semibold leading-relaxed text-zinc-200">
          {branding.copyPack.authPageCopy.heroParagraph}
        </p>
        <p className="mt-4 text-[10px] lg:text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
          {activeWarriorsCount ? `${activeWarriorsCount} ${interpolate(branding.copyPack.authPageCopy.activeWarriorsLabel, { streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural })}` : interpolate(branding.copyPack.authPageCopy.activeWarriorsLabel, { streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural })}
        </p>
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-200 bg-white px-4 py-5 lg:px-6 lg:py-6 shadow-md transition-transform duration-200 hover:scale-[1.01] animate-[fadeIn_0.6s_ease]">


        {isForgotMode || isResetMode ? (
          <div className="mb-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              {isForgotMode ? 'Forgot Password' : 'Reset Password'}
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-600">
              {isForgotMode
                ? 'Enter your email to receive a reset link.'
                : 'Set a new password for your account.'}
            </p>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={handleAuthSubmit}>


          {!isResetMode ? (
            <div className="space-y-1">
              <label className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Email</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
          ) : null}

          {!isForgotMode ? (
            <div className="space-y-1">
              <label className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                {isResetMode ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                placeholder={isResetMode ? 'New password' : 'Password'}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
          ) : null}

          {isResetMode ? (
            <div className="space-y-1">
              <label className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Confirm Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={resetPasswordConfirmInput}
                onChange={(event) => setResetPasswordConfirmInput(event.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-xl bg-gradient-to-r from-black to-gray-800 px-4 py-3 text-sm font-bold text-white mt-4 active:scale-95 transition disabled:opacity-60"
          >
            {submitLabel}
          </button>

          {isLoginMode ? (
            <>
              <button
                type="button"
                onClick={() => setAuthMode('forgot_password')}
                className="block mx-auto mt-3 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800"
              >
                Forgot password?
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Takes less than 10 seconds.</p>
              <p className="text-xs text-center mt-2 text-gray-500">{branding.copyPack.authPageCopy.footerCopy}</p>
            </>
          ) : null}

          {isForgotMode || isResetMode ? (
            <button
              type="button"
              onClick={() => {
                setResetPasswordToken('')
                setResetPasswordConfirmInput('')
                setPasswordInput('')
                setAuthMode('login')
              }}
              className="block mx-auto mt-3 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800"
            >
              Back to login
            </button>
          ) : null}
        </form>

        {authNotice ? <p className="mt-3 text-xs font-semibold text-emerald-600">{authNotice}</p> : null}
        {errorText ? <p className="mt-3 text-xs font-semibold text-red-600">{errorText}</p> : null}
      </section>
    </main>
  )
}

export default AuthPage
