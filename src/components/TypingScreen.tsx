import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  sentences: string[]
  onBack: () => void
}

type Phase = 'typing' | 'result'

interface RoundResult {
  wpm: number
  accuracy: number
  time: number
  sentence: string
}

function pickRandom(arr: string[], exclude?: string): string {
  if (arr.length === 1) return arr[0]
  const candidates = arr.filter(s => s !== exclude)
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export default function TypingScreen({ sentences, onBack }: Props) {
  const [current, setCurrent] = useState(() => pickRandom(sentences))
  const [typed, setTyped] = useState('')
  const [phase, setPhase] = useState<Phase>('typing')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [liveWpm, setLiveWpm] = useState(0)
  const [liveAccuracy, setLiveAccuracy] = useState(100)
  const [result, setResult] = useState<RoundResult | null>(null)
  const [totalErrors, setTotalErrors] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const wpmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    focusInput()
  }, [current, phase, focusInput])

  useEffect(() => {
    if (phase === 'typing') {
      focusInput()
    }
  }, [phase, focusInput])

  // Live WPM ticker
  useEffect(() => {
    if (startTime && phase === 'typing') {
      wpmTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000 / 60
        if (elapsed > 0) {
          setLiveWpm(Math.round(typed.length / 5 / elapsed))
        }
      }, 300)
    }
    return () => {
      if (wpmTimerRef.current) clearInterval(wpmTimerRef.current)
    }
  }, [startTime, typed.length, phase])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (phase !== 'typing') return
    const value = e.target.value

    if (!startTime && value.length > 0) {
      setStartTime(Date.now())
    }

    // Count errors at each new character
    if (value.length > typed.length) {
      const idx = value.length - 1
      if (value[idx] !== current[idx]) {
        setTotalErrors(prev => prev + 1)
      }
    }

    setTyped(value)

    // Compute live accuracy
    let correct = 0
    for (let i = 0; i < value.length; i++) {
      if (value[i] === current[i]) correct++
    }
    const acc = value.length > 0 ? Math.round((correct / value.length) * 100) : 100
    setLiveAccuracy(acc)

    // Check completion
    if (value === current) {
      const elapsed = startTime ? (Date.now() - startTime) / 1000 : 1
      const wpm = Math.round(current.length / 5 / (elapsed / 60))
      const totalTyped = value.length
      const errors = totalErrors + (value[value.length - 1] !== current[value.length - 1] ? 1 : 0)
      const accuracy = Math.round(((totalTyped - errors) / totalTyped) * 100)

      if (wpmTimerRef.current) clearInterval(wpmTimerRef.current)

      setResult({ wpm, accuracy: Math.max(0, accuracy), time: elapsed, sentence: current })
      setPhase('result')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (phase === 'result' && e.key === 'Enter') {
      nextSentence()
    }
  }

  function nextSentence() {
    const next = pickRandom(sentences, current)
    setCurrent(next)
    setTyped('')
    setPhase('typing')
    setStartTime(null)
    setLiveWpm(0)
    setLiveAccuracy(100)
    setTotalErrors(0)
    setResult(null)
  }

  // Character render for the target sentence
  function renderChars() {
    return current.split('').map((ch, i) => {
      let color = '#4a4a6a'   // untyped
      let bg = 'transparent'

      if (i < typed.length) {
        if (typed[i] === ch) {
          color = '#4ade80'   // correct = green
        } else {
          color = '#f87171'   // incorrect = red
          bg = 'rgba(248,113,113,0.1)'
        }
      } else if (i === typed.length) {
        color = '#e2e8f0'     // current cursor position
        bg = 'rgba(124,106,247,0.25)'
      }

      return (
        <span
          key={i}
          style={{
            color,
            background: bg,
            borderRadius: '2px',
            transition: 'color 0.05s',
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      )
    })
  }

  const elapsedSec = startTime ? (Date.now() - startTime) / 1000 : 0

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0d0d1a' }}
      onClick={focusInput}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4"
        style={{ borderBottom: '1px solid #1a1a3a' }}>
        <button
          onClick={onBack}
          className="text-sm tracking-widest transition-colors cursor-pointer px-4 py-2 rounded"
          style={{
            color: '#4a4a6a',
            background: 'transparent',
            border: '1px solid #2a2a4a',
            fontFamily: 'Courier New, monospace',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#7c6af7'; e.currentTarget.style.borderColor = '#7c6af7' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.borderColor = '#2a2a4a' }}
        >
          ← テキストを変える
        </button>

        {/* Stats */}
        <div className="flex gap-8">
          <StatBadge label="WPM" value={liveWpm} unit="" color="#7c6af7" />
          <StatBadge label="ACC" value={liveAccuracy} unit="%" color={liveAccuracy >= 90 ? '#4ade80' : liveAccuracy >= 70 ? '#fbbf24' : '#f87171'} />
          <StatBadge label="TIME" value={Math.round(elapsedSec)} unit="s" color="#64748b" />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative">

        {/* Sentence display */}
        <div className="w-full max-w-3xl mb-12">
          <div
            className="text-2xl leading-relaxed text-center select-none"
            style={{
              fontFamily: 'Courier New, monospace',
              letterSpacing: '0.05em',
              minHeight: '3rem',
            }}
          >
            {renderChars()}
          </div>
        </div>

        {/* Input */}
        <div className="w-full max-w-2xl relative">
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={phase === 'result'}
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
          {typed.length === 0 && phase === 'typing' && (
            <div
              className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-lg"
              style={{ color: '#2a2a4a', fontFamily: 'Courier New, monospace' }}
            >
              ここに入力してください...
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-2xl mt-4 rounded-full overflow-hidden" style={{ height: '3px', background: '#1a1a3a' }}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${(typed.length / current.length) * 100}%`,
              background: 'linear-gradient(90deg, #7c6af7, #4ade80)',
            }}
          />
        </div>

        <div className="mt-3 text-xs" style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}>
          {typed.length} / {current.length} 文字
        </div>

        {/* Result overlay */}
        {phase === 'result' && result && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(13,13,26,0.92)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="rounded-2xl px-12 py-10 text-center"
              style={{
                background: '#12122a',
                border: '1px solid #2a2a4a',
                boxShadow: '0 8px 64px rgba(0,0,0,0.6)',
                minWidth: '380px',
              }}
            >
              <div className="text-4xl mb-6" style={{ color: '#4ade80' }}>✓ CLEAR</div>

              <div className="flex justify-center gap-10 mb-8">
                <BigStat label="WPM" value={result.wpm} color="#7c6af7" />
                <BigStat label="精度" value={result.accuracy} unit="%" color={result.accuracy >= 90 ? '#4ade80' : '#fbbf24'} />
                <BigStat label="時間" value={parseFloat(result.time.toFixed(1))} unit="s" color="#64748b" />
              </div>

              <button
                onClick={nextSentence}
                className="w-full py-3 rounded-lg font-bold tracking-widest transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #7c6af7, #5b4fcf)',
                  color: '#fff',
                  border: 'none',
                  fontFamily: 'Courier New, monospace',
                  boxShadow: '0 4px 16px rgba(124,106,247,0.4)',
                }}
              >
                NEXT → (Enter)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
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

function BigStat({ label, value, unit = '', color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs tracking-widest mb-2" style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
        {label}
      </span>
      <span className="text-4xl font-bold" style={{ color, fontFamily: 'Courier New, monospace' }}>
        {value}
        <span className="text-lg">{unit}</span>
      </span>
    </div>
  )
}
