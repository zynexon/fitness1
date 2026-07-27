import branding, { interpolate } from '../../config/branding'

function LandingPage({ onTryGame, onLogin, activeWarriorsCount }) {
  return (
    <main className="w-full max-w-[480px] md:max-w-3xl lg:max-w-5xl mx-auto pb-12">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col px-5 pt-6 pb-8">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.28em] text-zinc-900">
            {branding.copyPack.landingPageCopy.navBrand}
          </span>
          <button
            type="button"
            onClick={onLogin}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] lg:text-xs font-bold text-white transition hover:bg-zinc-800 hover:border-zinc-600"
          >
            Log in
          </button>
        </div>

        {/* Hero card */}
        <div className="mt-6 flex flex-col">
          <div className="rounded-[2rem] border border-zinc-900 bg-zinc-950 px-6 pt-8 pb-6 lg:px-10 lg:pt-12 lg:pb-8 flex flex-col relative overflow-hidden">

            {/* Background texture — faint grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
              }}
            />

            <div className="relative z-10">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px flex-1 bg-zinc-700" />
                <span className="text-[9px] lg:text-[11px] font-black uppercase tracking-[0.32em] text-zinc-500">
                  {branding.copyPack.landingPageCopy.heroEyebrow}
                </span>
                <div className="h-px flex-1 bg-zinc-700" />
              </div>

              {/* Headline */}
              <h1 className="text-[42px] lg:text-5xl font-black leading-[0.92] tracking-[-0.03em] text-white">
                {branding.copyPack.landingPageCopy.heroHeadlineLines.map((line, i) => (<span key={i}>{line}{i < branding.copyPack.landingPageCopy.heroHeadlineLines.length - 1 && <br />}</span>))}
              </h1>

              {/* Sub-headline */}
              <p className="mt-5 text-sm lg:text-base font-semibold leading-relaxed text-zinc-300">
                {interpolate(branding.copyPack.landingPageCopy.heroSubHeadline, { appName: branding.appNameLower })}
              </p>

              {/* Social proof pill */}
              {activeWarriorsCount > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-zinc-300">
                    {activeWarriorsCount.toLocaleString()} {interpolate(branding.copyPack.landingPageCopy.activeWarriorsLabel, { streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural })}
                  </span>
                </div>
              )}

              {/* Primary CTA */}
              <button
                type="button"
                onClick={onTryGame}
                className="mt-6 w-full rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-wider text-zinc-950 transition-all duration-200 hover:bg-zinc-100 active:scale-[0.98]"
              >
                {branding.copyPack.landingPageCopy.heroCTA}
              </button>

              <p className="mt-2.5 text-center text-[10px] lg:text-xs font-semibold text-zinc-600">
                {branding.copyPack.landingPageCopy.heroSubCTA}
              </p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.22em] text-zinc-400">{branding.copyPack.landingPageCopy.scrollIndicator}</p>
            <div className="flex flex-col gap-1 items-center">
              <div className="h-4 w-px bg-zinc-300" />
              <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            </div>
          </div>
        </div>
      </section>

      {/* ── THE PROBLEM ──────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-6 lg:px-8 lg:py-8">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-4">
            {branding.copyPack.landingPageCopy.problemEyebrow}
          </p>
          <div className="space-y-4">
            {branding.copyPack.landingPageCopy.problemBullets.map((line, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-[10px] font-black text-zinc-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-semibold leading-relaxed text-zinc-700">{line}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-zinc-100 pt-5">
            <p className="text-base font-black leading-snug text-zinc-900">
              {interpolate(branding.copyPack.landingPageCopy.problemCallout, { appName: branding.appNameLower })}
            </p>
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">
            {branding.copyPack.landingPageCopy.featureEyebrow}
          </p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branding.copyPack.landingPageCopy.featureCards.map(({ icon, title, color, desc }) => (
            <div
              key={title}
              className={`rounded-2xl border border-zinc-200 bg-white px-4 py-4 border-l-4 ${color}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xl leading-none">{icon}</span>
                <p className="text-sm font-black text-zinc-900">{title}</p>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-zinc-500">{interpolate(desc, { streakUnitLabel: branding.copyPack.streakUnitLabel })}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STREAK SYSTEM ────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 px-5 py-6 relative overflow-hidden">
          {/* Faint number watermark */}
          <div className="pointer-events-none absolute right-4 top-2 text-[96px] font-black leading-none text-white opacity-[0.04] select-none">
            🔥
          </div>

          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500 mb-1">
              The mechanic that changes everything
            </p>
            <h2 className="text-2xl font-black text-white leading-tight">
              The Streak.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-300">
              Every day you complete tasks, your streak grows. Skip one day — it resets to zero. That single rule creates a daily urgency that no notification can replicate.
            </p>

            {/* Streak visual */}
            <div className="mt-5 flex gap-1.5">
              {[true, true, true, true, true, true, false, false].map((active, i) => (
                <div
                  key={i}
                  className={`flex-1 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                    active
                      ? 'bg-white text-zinc-950 font-black'
                      : i === 6
                        ? 'border-2 border-dashed border-zinc-600 text-zinc-600 font-bold text-xs'
                        : 'bg-zinc-800'
                  }`}
                >
                  {active ? '🔥' : i === 6 ? 'today' : ''}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-zinc-600">
              {branding.copyPack.landingPageCopy.streakVisualLabel}
            </p>

            <div className="mt-5 space-y-2.5">
              {[
                { icon: '🛡️', text: branding.copyPack.landingPageCopy.streakShieldCopy },
                { icon: '📊', text: branding.copyPack.landingPageCopy.weeklyReportCopy },
                { icon: '⚡', text: interpolate(branding.copyPack.landingPageCopy.rankMilestoneCopy, { appName: branding.appName }) },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>
                  <p className="text-xs font-semibold leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RANK LADDER PREVIEW ───────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">{branding.copyPack.landingPageCopy.rankEyebrow}</p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold text-zinc-500 mb-3 leading-relaxed">
            {branding.copyPack.landingPageCopy.rankDescription}
          </p>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {branding.copyPack.landingPageCopy.rankLadderSample.map(r => ({...r, name: interpolate(r.name, { appName: branding.appName })})).map((rankData, index) => {
              const dim = index < 3;
              const special = index === branding.copyPack.landingPageCopy.rankLadderSample.length - 1;
              return (
              <div
                key={rankData.level}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  special
                    ? 'bg-zinc-950 border border-zinc-700'
                    : dim
                      ? 'bg-zinc-50'
                      : 'bg-zinc-100'
                }`}
              >
                <span className={`text-[10px] font-black w-10 ${special ? 'text-amber-400' : dim ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Lv.{rankData.level}
                </span>
                <span className={`text-xs font-black uppercase tracking-wider ${special ? 'text-amber-400' : dim ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {rankData.name}
                </span>
                {special && <span className="ml-auto text-sm">🏴</span>}
              </div>
            )})}
          </div>

          <p className="mt-3 text-[10px] font-semibold text-zinc-400 text-center">
            {branding.copyPack.landingPageCopy.rankMoreCopy}
          </p>
        </div>
      </section>

      {/* ── SOCIAL PROOF / NUMBERS ───────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: activeWarriorsCount > 0 ? activeWarriorsCount.toLocaleString() : '—', label: interpolate(branding.copyPack.landingPageCopy.statLabels.warriors, { streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural }) },
            { value: '10',   label: branding.copyPack.landingPageCopy.statLabels.games },
            { value: '30',   label: branding.copyPack.landingPageCopy.statLabels.levels },
          ].map(({ value, label }) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 text-center">
              <p className="text-2xl font-black text-zinc-950">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-zinc-400 whitespace-pre-line leading-tight">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400">{branding.copyPack.landingPageCopy.dailyLoopEyebrow}</p>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {branding.copyPack.landingPageCopy.dailyLoopSteps.map(({ step, title, body }) => (
            <div key={step} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5">
              <span className="text-[10px] font-black text-zinc-300 mt-0.5 shrink-0 w-4">{step}</span>
              <div>
                <p className="text-sm font-black text-zinc-900">{title}</p>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-zinc-500">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── GAME DEMO HOOK ───────────────────────────────────────────────────── */}
      <section className="px-5 pb-12">
        <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-6 lg:px-8 lg:py-8 text-center space-y-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-400 mb-2">
              {branding.copyPack.landingPageCopy.gameDemoEyebrow}
            </p>
            <h3 className="text-xl font-black text-zinc-950">{branding.copyPack.landingPageCopy.gameDemoTitle}</h3>
            <p className="mt-1.5 text-sm font-semibold text-zinc-500 leading-relaxed">
              {branding.copyPack.landingPageCopy.gameDemoDesc}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            {[
              { label: 'Questions', value: 'Unlimited' },
              { label: 'Time', value: '30 sec' },
              { label: 'XP', value: 'Up to 50' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-black text-zinc-900">{value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onTryGame}
            className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            {branding.copyPack.landingPageCopy.gameDemoCTA}
          </button>
          <p className="text-[10px] font-semibold text-zinc-400">
            After the game you'll see how your score compares and what's inside the full app.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="px-5">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 px-5 py-8 lg:px-10 lg:py-12 text-center relative overflow-hidden">
          {/* Background texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative z-10">
            <p className="text-[9px] font-black uppercase tracking-[0.32em] text-zinc-500">
              {branding.copyPack.landingPageCopy.finalCTAEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white">
              {branding.copyPack.landingPageCopy.finalCTAHeadline}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-400">
              {branding.copyPack.landingPageCopy.finalCTABody}
            </p>

            <button
              type="button"
              onClick={onLogin}
              className="mt-6 w-full rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-100 active:scale-[0.98]"
            >
              Log In to Continue
            </button>

            <p className="mt-5 text-[10px] font-semibold text-zinc-600">
              {activeWarriorsCount > 0 ? interpolate(branding.copyPack.landingPageCopy.finalCTAFooter, { count: activeWarriorsCount.toLocaleString(), streakUnitLabelPlural: branding.copyPack.streakUnitLabelPlural }) : 'Others who chose discipline over excuses.'}
            </p>
          </div>
        </div>
      </section>

    </main>
  )
}

export default LandingPage
