import { useState } from 'react'

function useAuth(accessTokenKey) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [userEmail, setUserEmail] = useState('')
  const [accessToken, setAccessToken] = useState(localStorage.getItem(accessTokenKey) || '')
  const [authMode, setAuthMode] = useState('landing')
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [userName, setUserName] = useState('')
  const [nameUpdating, setNameUpdating] = useState(false)
  const [isProfileEditingName, setIsProfileEditingName] = useState(false)
  const [resetPasswordToken, setResetPasswordToken] = useState('')
  const [resetPasswordConfirmInput, setResetPasswordConfirmInput] = useState('')

  return {
    user,
    setUser,
    loading,
    setLoading,
    level,
    setLevel,
    xp,
    setXp,
    streakDays,
    setStreakDays,
    userEmail,
    setUserEmail,
    accessToken,
    setAccessToken,
    authMode,
    setAuthMode,
    nameInput,
    setNameInput,
    emailInput,
    setEmailInput,
    passwordInput,
    setPasswordInput,
    isLoading,
    setIsLoading,
    errorText,
    setErrorText,
    authLoading,
    setAuthLoading,
    authNotice,
    setAuthNotice,
    userName,
    setUserName,
    nameUpdating,
    setNameUpdating,
    isProfileEditingName,
    setIsProfileEditingName,
    resetPasswordToken,
    setResetPasswordToken,
    resetPasswordConfirmInput,
    setResetPasswordConfirmInput,
  }
}

export default useAuth
