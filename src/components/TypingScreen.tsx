import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  sentences: string[]
  timeLimit: number
  onBack: () => void
}

type Phase = 'countdown' | 'playing' | 'finished'

function pickRandom(arr: string[], exclude?: string): string {
  if (arr.length === 1) return arr[0]
  const pool = arr.filter(s => s !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

function StatBadge({
  label, value, unit = '', color,
}: { label: string; value: number; unit?: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs tracking-widest mb-1" style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
        {label}
      </span>
      <span className="text-xl font-bold" style={{ color, fontFamily: 'Courier New, monospace' }}>
        {value}{unit}
      </span>
    </div>
  )
}

function BigStat({
  label, value, unit = '', color,
}: { label: string; value: number; unit?: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs tracking-widest mb-2" style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
        {label}
      </span>
      <span className="font-bold" style={{ color, fontFamily: 'Courier New, monospace', fontSize: '2.5rem' }}>
        {value}
        <span style={{ fontSize: '1.2rem' }}>{unit}</span>
      </span>
    </div>
  )
}

export default function TypingScreen({ sentences, timeLimit, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [current, setCurrent] = useState(() => pickRandom(sentences))
  const [typed, setTyped] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [completedChars, setCompletedChars] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Countdown 3 → 2 → 1 → GO
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      setPhase('playing')
      return
    }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown])

  // Game timer
  useEffect(() => {
    if (phase !== 'playing') return
    if (timeLeft <= 0) {
      setPhase('finished')
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft])

  // Always keep input focused during play
  const focusInput = useCallback(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    if (phase === 'playing') focusInput()
  }, [phase, current, focusInput])

  const elapsed = timeLimit - timeLeft
  const wpm = elapsed > 0 ? Math.round((completedChars / 5) / (elapsed / 60)) : 0
  const totalKeyed = completedChars + errorCount
  const accuracy = totalKeyed > 0 ? Math.round((completedChars / totalKeyed) * 100) : 100

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase !== 'playing') return
    const value = e.target.value

    // Count errors on each forward keystroke
    if (value.length > typed.length) {
      const idx = value.length - 1
      if (idx < current.length && value[idx] !== current[idx]) {
        setErrorCount(prev => prev + 1)
      }
    }

    setTyped(value)

    // Sentence complete
    if (value === current) {
      setCompletedChars(prev => prev + current.length)
      setCompletedCount(prev => prev + 1)
      setCurrent(pickRandom(sentences, current))
      setTyped('')
    }
  }

  function renderChars() {
    return current.split('').map((ch, i) => {
      let color = '#4a4a6a'
      let bg = 'transparent'
      if (i < typed.length) {
        color = typed[i] === ch ? '#4ade80' : '#f87171'
        bg = typed[i] !== ch ? 'rgba(248,113,113,0.1)' : 'transparent'
      } else if (i === typed.length) {
        color = '#e2e8f0'
        bg = 'rgba(124,106,247,0.3)'
      }
      return (
        <span key={i} style={{ color, background: bg, borderRadius: '3px', transition: 'color 0.05s' }}>
          {ch}
        </span>
      )
    })
  }

  const timerRatio = timeLeft / timeLimit
  const timerColor = timerRatio > 0.5 ? '#4ade80' : timerRatio > 0.25 ? '#fbbf24' : '#f87171'

  function resetGame() {
    setPhase('countdown')
    setCountdown(3)
    setTimeLeft(timeLimit)
    setCurrent(pickRandom(sentences))
    setTyped('')
    setCompletedCount(0)
    setCompletedChars(0)
    setErrorCount(0)
  }

  /* ── COUNTDOWN ─────────────────────────────────── */
  if (phase === 'countdown') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: '#0d0d1a' }}
      >
        <div
          className="font-bold select-none"
          style={{
            fontSize: countdown === 0 ? '4rem' : '9rem',
            color: countdown === 0 ? '#4ade80' : '#7c6af7',
            fontFamily: 'Courier New, monospace',
            transition: 'all 0.3s',
            textShadow: `0 0 60px ${countdown === 0 ? 'rgba(74,222,128,0.5)' : 'rgba(124,106,247,0.5)'}`,
          }}
        >
          {countdown === 0 ? 'GO!' : countdown}
        </div>
        <div className="mt-6 text-sm tracking-widest" style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
          {countdown > 0 ? '準備して...' : ''}
        </div>
      </div>
    )
  }

  /* ── FINISHED ──────────────────────────────────── */
  if (phase === 'finished') {
    const rank = wpm >= 80 ? 'S' : wpm >= 60 ? 'A' : wpm >= 40 ? 'B' : wpm >= 20 ? 'C' : 'D'
    const rankColor = rank === 'S' ? '#fbbf24' : rank === 'A' ? '#4ade80' : rank === 'B' ? '#7c6af7' : rank === 'C' ? '#64748b' : '#f87171'

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: '#0d0d1a' }}
      >
        <div
          className="w-full max-w-md rounded-2xl px-10 py-12 text-center"
          style={{ background: '#12122a', border: '1px solid #2a2a4a', boxShadow: '0 8px 64px rgba(0,0,0,0.6)' }}
        >
          {/* Rank */}
          <div
            className="text-8xl font-bold mb-1"
            style={{ color: rankColor, fontFamily: 'Courier New, monospace', textShadow: `0 0 40px ${rankColor}80` }}
          >
            {rank}
          </div>
          <div className="text-xs tracking-widest mb-8" style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
            RANK
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <BigStat label="WPM" value={wpm} color="#7c6af7" />
            <BigStat label="精度" value={accuracy} unit="%" color={accuracy >= 90 ? '#4ade80' : '#fbbf24'} />
            <BigStat label="完了" value={completedCount} unit="文" color="#64748b" />
          </div>

          {/* Detail */}
          <div
            className="text-xs mb-8 py-3 rounded-lg"
            style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace', background: '#0d0d1a' }}
          >
            {completedChars}文字 ／ {errorCount}ミス ／ {timeLimit}秒
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-lg font-bold text-sm tracking-widest cursor-pointer"
              style={{
                background: 'transparent',
                border: '1px solid #2a2a4a',
                color: '#4a4a6a',
                fontFamily: 'Courier New, monospace',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6af7'; e.currentTarget.style.color = '#7c6af7' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#4a4a6a' }}
            >
              ← リストへ
            </button>
            <button
              onClick={resetGame}
              className="flex-1 py-3 rounded-lg font-bold text-sm tracking-widest cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #7c6af7, #5b4fcf)',
                border: 'none',
                color: '#fff',
                fontFamily: 'Courier New, monospace',
                boxShadow: '0 4px 16px rgba(124,106,247,0.4)',
              }}
            >
              もう一度 ↺
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── PLAYING ───────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0d0d1a' }}
      onClick={focusInput}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-8 py-3"
        style={{ borderBottom: '1px solid #1a1a3a' }}
      >
        {/* Back */}
        <button
          onClick={onBack}
          className="text-sm cursor-pointer px-3 py-2 rounded"
          style={{
            color: '#4a4a6a',
            background: 'transparent',
            border: '1px solid #2a2a4a',
            fontFamily: 'Courier New, monospace',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#7c6af7'; e.currentTarget.style.borderColor = '#7c6af7' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.borderColor = '#2a2a4a' }}
        >
          ← リストへ
        </button>

        {/* Timer (center) */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="font-bold"
            style={{ fontSize: '2.2rem', color: timerColor, fontFamily: 'Courier New, monospace', lineHeight: 1 }}
          >
            {timeLeft}
          </span>
          {/* Timer bar */}
          <div className="w-28 rounded-full overflow-hidden" style={{ height: '4px', background: '#1a1a3a' }}>
            <div
              style={{
                width: `${timerRatio * 100}%`,
                height: '100%',
                background: timerColor,
                borderRadius: '999px',
                transition: 'width 1s linear, background 0.5s',
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8">
          <StatBadge label="WPM" value={wpm} color="#7c6af7" />
          <StatBadge
            label="ACC"
            value={accuracy}
            unit="%"
            color={accuracy >= 90 ? '#4ade80' : accuracy >= 70 ? '#fbbf24' : '#f87171'}
          />
          <StatBadge label="完了" value={completedCount} unit="文" color="#64748b" />
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">

        {/* Sentence */}
        <div className="w-full max-w-3xl mb-10">
          <div
            className="leading-relaxed text-center select-none"
            style={{ fontFamily: 'Courier New, monospace', letterSpacing: '0.06em', fontSize: '1.6rem' }}
          >
            {renderChars()}
          </div>
        </div>

        {/* Input field */}
        <div className="w-full max-w-2xl relative">
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={handleInput}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full px-6 py-5 rounded-xl text-lg outline-none"
            style={{
              background: '#12122a',
              border: '2px solid #2a2a4a',
              color: '#e2e8f0',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '0.08em',
              caretColor: '#7c6af7',
              boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#7c6af7' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#2a2a4a' }}
          />
          {typed.length === 0 && (
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-lg"
              style={{ color: '#2a2a4a', fontFamily: 'Courier New, monospace' }}
            >
              ここに入力...
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="w-full max-w-2xl mt-4 rounded-full overflow-hidden"
          style={{ height: '3px', background: '#1a1a3a' }}
        >
          <div
            style={{
              width: `${current.length > 0 ? (typed.length / current.length) * 100 : 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #7c6af7, #4ade80)',
              transition: 'width 0.1s',
            }}
          />
        </div>

        <div className="mt-3 text-xs" style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}>
          {typed.length} / {current.length} 文字
        </div>
      </div>
    </div>
  )
}
