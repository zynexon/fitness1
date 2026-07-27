import { useState } from 'react'

function readLastTrainingResult(lastTrainingResultKey) {
  const raw = localStorage.getItem(lastTrainingResultKey)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    if (
      parsed
      && typeof parsed.label === 'string'
      && parsed.label
      && Number.isFinite(Number(parsed.score))
    ) {
      return {
        label: parsed.label,
        score: Number(parsed.score),
      }
    }
  } catch {
    return null
  }

  return null
}

function useGameSession(bestGameScoreKey, lastTrainingResultKey) {
  const [activeTab, setActiveTab] = useState('Home')
  const [gameRoute, setGameRoute] = useState('/game')

  const [gameSessionId, setGameSessionId] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore] = useState(0)
  const [bestGameScore, setBestGameScore] = useState(() => {
    const stored = Number.parseInt(localStorage.getItem(bestGameScoreKey) || '0', 10)
    return Number.isNaN(stored) ? 0 : stored
  })
  const [lastTrainingResult, setLastTrainingResult] = useState(() => readLastTrainingResult(lastTrainingResultKey))
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [gameSubmitting, setGameSubmitting] = useState(false)
  const [gameResult, setGameResult] = useState(null)
  const [animatedGameXp, setAnimatedGameXp] = useState(0)

  const [focusTapSessionId, setFocusTapSessionId] = useState('')
  const [focusTapSubmitting, setFocusTapSubmitting] = useState(false)
  const [focusTapXpAwarded, setFocusTapXpAwarded] = useState(null)
  const [focusTapResult, setFocusTapResult] = useState(null)
  const [focusTapError, setFocusTapError] = useState('')

  const [numberRecallSessionId, setNumberRecallSessionId] = useState('')
  const [numberRecallSubmitting, setNumberRecallSubmitting] = useState(false)
  const [numberRecallXpAwarded, setNumberRecallXpAwarded] = useState(null)
  const [numberRecallResult, setNumberRecallResult] = useState(null)
  const [numberRecallError, setNumberRecallError] = useState('')

  const [colorCountSessionId, setColorCountSessionId] = useState('')
  const [colorCountSubmitting, setColorCountSubmitting] = useState(false)
  const [colorCountXpAwarded, setColorCountXpAwarded] = useState(null)
  const [colorCountResult, setColorCountResult] = useState(null)
  const [colorCountError, setColorCountError] = useState('')

  const [speedPatternSessionId, setSpeedPatternSessionId] = useState('')
  const [speedPatternSubmitting, setSpeedPatternSubmitting] = useState(false)
  const [speedPatternXpAwarded, setSpeedPatternXpAwarded] = useState(null)
  const [speedPatternResult, setSpeedPatternResult] = useState(null)
  const [speedPatternError, setSpeedPatternError] = useState('')

  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPopup, setShowInstallPopup] = useState(false)
  const [installEligible, setInstallEligible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [prevLevel, setPrevLevel] = useState(1)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [pendingLevelUpLevel, setPendingLevelUpLevel] = useState(null)

  return {
    activeTab,
    setActiveTab,
    gameRoute,
    setGameRoute,
    gameSessionId,
    setGameSessionId,
    gameStarted,
    setGameStarted,
    timeLeft,
    setTimeLeft,
    score,
    setScore,
    bestGameScore,
    setBestGameScore,
    lastTrainingResult,
    setLastTrainingResult,
    currentQuestion,
    setCurrentQuestion,
    userAnswer,
    setUserAnswer,
    gameSubmitting,
    setGameSubmitting,
    gameResult,
    setGameResult,
    animatedGameXp,
    setAnimatedGameXp,
    focusTapSessionId,
    setFocusTapSessionId,
    focusTapSubmitting,
    setFocusTapSubmitting,
    focusTapXpAwarded,
    setFocusTapXpAwarded,
    focusTapResult,
    setFocusTapResult,
    focusTapError,
    setFocusTapError,
    numberRecallSessionId,
    setNumberRecallSessionId,
    numberRecallSubmitting,
    setNumberRecallSubmitting,
    numberRecallXpAwarded,
    setNumberRecallXpAwarded,
    numberRecallResult,
    setNumberRecallResult,
    numberRecallError,
    setNumberRecallError,
    colorCountSessionId,
    setColorCountSessionId,
    colorCountSubmitting,
    setColorCountSubmitting,
    colorCountXpAwarded,
    setColorCountXpAwarded,
    colorCountResult,
    setColorCountResult,
    colorCountError,
    setColorCountError,
    speedPatternSessionId,
    setSpeedPatternSessionId,
    speedPatternSubmitting,
    setSpeedPatternSubmitting,
    speedPatternXpAwarded,
    setSpeedPatternXpAwarded,
    speedPatternResult,
    setSpeedPatternResult,
    speedPatternError,
    setSpeedPatternError,
    deferredPrompt,
    setDeferredPrompt,
    showInstallPopup,
    setShowInstallPopup,
    installEligible,
    setInstallEligible,
    isInstalled,
    setIsInstalled,
    prevLevel,
    setPrevLevel,
    showLevelUp,
    setShowLevelUp,
    pendingLevelUpLevel,
    setPendingLevelUpLevel,
  }
}

export default useGameSession
