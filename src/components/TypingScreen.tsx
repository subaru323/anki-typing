import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface Props {
  sentences: string[]
  timeLimit: number
  onBack: () => void
}

type GamePhase = 'countdown' | 'playing' | 'sentence-done' | 'finished'

// ── Utilities ─────────────────────────────────────────────────────────────

const SKIP_SET = new Set('○●◎◯□■△▲▽▼◇◆☆★※×＊〇〻'.split(''))

interface Segment {
  display: string   // 表示テキスト（漢字など）
  reading: string   // タイピング対象（フリガナ or テキスト自身）
  ruby?: string     // ルビ表示用（display と異なる場合）
  skip: boolean
}

interface SegInfo extends Segment {
  start: number     // typing target 内の開始位置
  end: number       // typing target 内の終了位置
}

/**
 * {漢字|よみ} 記法をパース。
 * ・{漢字|よみ} → display=漢字, reading=よみ, ruby=よみ
 * ・その他の1文字 → display=reading=文字, ruby=undefined
 * ・スキップ文字 → skip=true, reading=''
 */
function parseSegments(raw: string): Segment[] {
  const result: Segment[] = []
  let last = 0
  const re = /\{([^|{}]+)\|([^|{}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    // 前の平文
    for (const ch of raw.slice(last, m.index)) {
      const skip = SKIP_SET.has(ch)
      result.push({ display: ch, reading: skip ? '' : ch, skip })
    }
    // {漢字|よみ} グループ
    result.push({ display: m[1], reading: m[2], ruby: m[2], skip: false })
    last = m.index + m[0].length
  }
  for (const ch of raw.slice(last)) {
    const skip = SKIP_SET.has(ch)
    result.push({ display: ch, reading: skip ? '' : ch, skip })
  }
  return result
}

/** Segment にタイピング位置情報を付加し、全体のタイピング対象文字列を返す */
function buildSegInfos(segs: Segment[]): { infos: SegInfo[]; target: string } {
  let pos = 0
  const infos: SegInfo[] = segs.map(s => {
    if (s.skip) return { ...s, start: pos, end: pos }
    const info: SegInfo = { ...s, start: pos, end: pos + s.reading.length }
    pos += s.reading.length
    return info
  })
  return { infos, target: infos.map(i => i.reading).join('') }
}

function pickRandom(arr: string[], exclude?: string): string {
  if (arr.length === 1) return arr[0]
  const pool = arr.filter(s => s !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatBadge({ label, value, unit = '', color }: {
  label: string; value: number; unit?: string; color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs tracking-widest mb-1"
        style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>{label}</span>
      <span className="text-xl font-bold"
        style={{ color, fontFamily: 'Courier New, monospace' }}>{value}{unit}</span>
    </div>
  )
}

function BigStat({ label, value, unit = '', color }: {
  label: string; value: number; unit?: string; color: string
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs tracking-widest mb-2"
        style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>{label}</span>
      <span className="font-bold" style={{ color, fontFamily: 'Courier New, monospace', fontSize: '2.5rem' }}>
        {value}<span style={{ fontSize: '1.1rem' }}>{unit}</span>
      </span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function TypingScreen({ sentences, timeLimit, onBack }: Props) {
  const [phase, setPhase] = useState<GamePhase>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [currentRaw, setCurrentRaw] = useState(() => pickRandom(sentences))
  const [typed, setTyped] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [completedChars, setCompletedChars] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)
  const typedRef = useRef('')          // typed の最新値を同期して持つ ref
  const targetRef = useRef('')         // target の最新値

  // 文ごとの派生値
  const { infos, target } = useMemo(() => {
    const segs = parseSegments(currentRaw)
    return buildSegInfos(segs)
  }, [currentRaw])

  // ref を常に最新に保つ
  typedRef.current = typed
  targetRef.current = target

  // 経過時間・統計
  const elapsed = timeLimit - timeLeft
  const wpm = elapsed > 0 ? Math.round((completedChars / 5) / (elapsed / 60)) : 0
  const totalKeyed = completedChars + errorCount
  const accuracy = totalKeyed > 0 ? Math.round((completedChars / totalKeyed) * 100) : 100
  const timerRatio = timeLeft / timeLimit
  const timerColor = timerRatio > 0.5 ? '#4ade80' : timerRatio > 0.25 ? '#fbbf24' : '#f87171'

  // ── カウントダウン ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) { setPhase('playing'); return }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, countdown])

  // ── ゲームタイマー ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'sentence-done') return
    if (timeLeft <= 0) {
      if (phase === 'sentence-done') {
        setCompletedChars(prev => prev + targetRef.current.length)
        setCompletedCount(prev => prev + 1)
      }
      setPhase('finished')
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [phase, timeLeft])

  // ── フォーカス管理 ─────────────────────────────────────────────────────
  const focusInput = useCallback(() => inputRef.current?.focus(), [])
  useEffect(() => {
    if (phase === 'playing' || phase === 'sentence-done') focusInput()
  }, [phase, currentRaw, focusInput])

  // ── 入力処理 ───────────────────────────────────────────────────────────
  function processInput(value: string) {
    if (value === typedRef.current) return   // 二重処理防止

    // 新規入力文字のエラーチェック
    if (value.length > typedRef.current.length) {
      const idx = value.length - 1
      const tgt = targetRef.current
      if (idx < tgt.length && value[idx] !== tgt[idx]) {
        setErrorCount(prev => prev + 1)
      }
    }

    typedRef.current = value
    setTyped(value)

    if (value === targetRef.current && targetRef.current.length > 0) {
      setPhase('sentence-done')
    }
  }

  // ── IME イベント ───────────────────────────────────────────────────────
  function handleCompositionStart() {
    isComposingRef.current = true
  }
  function handleCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
    isComposingRef.current = false
    // compositionEnd のあとに onChange が来ない場合を補うため直接処理
    if (phase === 'playing') {
      processInput((e.target as HTMLInputElement).value)
    }
  }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isComposingRef.current) return   // 変換中は無視
    if (phase !== 'playing') return
    processInput(e.target.value)
  }

  // ── Enter キー：文完了後に次へ ─────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isComposingRef.current && phase === 'sentence-done') {
      advanceSentence()
    }
  }

  function advanceSentence() {
    setCompletedChars(prev => prev + targetRef.current.length)
    setCompletedCount(prev => prev + 1)
    const next = pickRandom(sentences, currentRaw)
    setCurrentRaw(next)
    typedRef.current = ''
    setTyped('')
    setPhase('playing')
  }

  function resetGame() {
    setPhase('countdown')
    setCountdown(3)
    setTimeLeft(timeLimit)
    setCurrentRaw(pickRandom(sentences))
    typedRef.current = ''
    setTyped('')
    setCompletedCount(0)
    setCompletedChars(0)
    setErrorCount(0)
  }

  // ── 文表示レンダリング ─────────────────────────────────────────────────
  /**
   * - ruby あり（漢字グループ）→ ブロック単位で色付け
   * - ruby なし（ひらがな・カタカナ・記号）→ 1文字ずつ色付け
   * - skip → 取り消し線で表示
   */
  function renderSentence() {
    const isDone = phase === 'sentence-done'

    return infos.map((info, i) => {
      // ── スキップ文字
      if (info.skip) {
        return (
          <span key={i} style={{ color: '#3a3a5a', textDecoration: 'line-through', opacity: 0.5 }}>
            {info.display}
          </span>
        )
      }

      const { start, end, reading, display, ruby } = info
      const typedSlice = typed.slice(start, Math.min(end, typed.length))
      const isComplete = typed.length >= end
      const isCurrent = !isComplete && typed.length > start

      if (ruby) {
        // ── 漢字＋ルビ：ブロック単位で色付け
        let blockColor = '#4a4a6a'
        let blockBg = 'transparent'
        if (isDone || isComplete) {
          const correct = typedSlice === reading
          blockColor = correct ? '#4ade80' : '#f87171'
        } else if (isCurrent) {
          blockColor = '#e2e8f0'
          blockBg = 'rgba(124,106,247,0.15)'
        }

        // 入力途中のルビ進捗（ひらがな何文字まで打てたか）
        const readingChars = reading.split('').map((rch, ri) => {
          const pos = start + ri
          let c = '#4a4a6a'
          if (isDone || isComplete) c = typedSlice === reading ? '#4ade80' : '#f87171'
          else if (pos < typed.length) c = typed[pos] === rch ? '#4ade80' : '#f87171'
          else if (pos === typed.length) c = '#a78bfa'
          return (
            <span key={ri} style={{ color: c, transition: 'color 0.05s' }}>{rch}</span>
          )
        })

        return (
          <ruby key={i} style={{
            background: blockBg,
            borderRadius: '4px',
            padding: '0 2px',
            margin: '0 1px',
            color: blockColor,
            transition: 'color 0.1s',
          }}>
            {display}
            <rt style={{ fontSize: '0.5em', letterSpacing: '0.05em', lineHeight: 1.5 }}>
              {readingChars}
            </rt>
          </ruby>
        )
      }

      // ── 平文（ひらがな・カタカナ・句読点など）：1文字ずつ
      return (
        <span key={i}>
          {display.split('').map((ch, ci) => {
            const pos = start + ci
            let color = '#4a4a6a'
            let bg = 'transparent'
            if (isDone) {
              color = '#4ade80'
            } else if (pos < typed.length) {
              color = typed[pos] === ch ? '#4ade80' : '#f87171'
              bg    = typed[pos] !== ch ? 'rgba(248,113,113,0.12)' : 'transparent'
            } else if (pos === typed.length) {
              color = '#e2e8f0'
              bg    = 'rgba(124,106,247,0.3)'
            }
            return (
              <span key={ci} style={{ color, background: bg, borderRadius: '3px', transition: 'color 0.05s' }}>
                {ch}
              </span>
            )
          })}
        </span>
      )
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Render: COUNTDOWN
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0d0d1a' }}>
        <div className="font-bold select-none" style={{
          fontSize: countdown === 0 ? '4rem' : '9rem',
          color: countdown === 0 ? '#4ade80' : '#7c6af7',
          fontFamily: 'Courier New, monospace',
          textShadow: `0 0 60px ${countdown === 0 ? 'rgba(74,222,128,0.5)' : 'rgba(124,106,247,0.5)'}`,
        }}>
          {countdown === 0 ? 'GO!' : countdown}
        </div>
        <div className="mt-6 text-sm tracking-widest"
          style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
          {countdown > 0 ? '準備して...' : ''}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Render: FINISHED
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'finished') {
    const rank = wpm >= 80 ? 'S' : wpm >= 60 ? 'A' : wpm >= 40 ? 'B' : wpm >= 20 ? 'C' : 'D'
    const rankColor = ({ S: '#fbbf24', A: '#4ade80', B: '#7c6af7', C: '#64748b', D: '#f87171' } as const)[rank]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0d0d1a' }}>
        <div className="w-full max-w-md rounded-2xl px-10 py-12 text-center"
          style={{ background: '#12122a', border: '1px solid #2a2a4a', boxShadow: '0 8px 64px rgba(0,0,0,0.6)' }}>
          <div className="font-bold mb-1"
            style={{ fontSize: '5rem', color: rankColor, fontFamily: 'Courier New, monospace', textShadow: `0 0 40px ${rankColor}80` }}>
            {rank}
          </div>
          <div className="text-xs tracking-widest mb-8" style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>RANK</div>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <BigStat label="WPM" value={wpm} color="#7c6af7" />
            <BigStat label="精度" value={accuracy} unit="%" color={accuracy >= 90 ? '#4ade80' : '#fbbf24'} />
            <BigStat label="完了" value={completedCount} unit="文" color="#64748b" />
          </div>
          <div className="text-xs mb-8 py-3 rounded-lg"
            style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace', background: '#0d0d1a' }}>
            {completedChars}文字 ／ {errorCount}ミス ／ {timeLimit}秒
          </div>
          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 py-3 rounded-lg font-bold text-sm cursor-pointer"
              style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6af7'; e.currentTarget.style.color = '#7c6af7' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#4a4a6a' }}>
              ← リストへ
            </button>
            <button onClick={resetGame} className="flex-1 py-3 rounded-lg font-bold text-sm cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #7c6af7, #5b4fcf)', border: 'none', color: '#fff', fontFamily: 'Courier New, monospace', boxShadow: '0 4px 16px rgba(124,106,247,0.4)' }}>
              もう一度 ↺
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Render: PLAYING / SENTENCE-DONE
  // ══════════════════════════════════════════════════════════════════════════
  const isDone = phase === 'sentence-done'
  const progress = target.length > 0 ? typed.length / target.length : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0d1a' }} onClick={focusInput}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-3" style={{ borderBottom: '1px solid #1a1a3a' }}>
        <button onClick={onBack} className="text-sm cursor-pointer px-3 py-2 rounded"
          style={{ color: '#4a4a6a', background: 'transparent', border: '1px solid #2a2a4a', fontFamily: 'Courier New, monospace' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#7c6af7'; e.currentTarget.style.borderColor = '#7c6af7' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.borderColor = '#2a2a4a' }}>
          ← リストへ
        </button>

        {/* タイマー */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-bold" style={{ fontSize: '2.2rem', color: timerColor, fontFamily: 'Courier New, monospace', lineHeight: 1 }}>
            {timeLeft}
          </span>
          <div className="w-28 rounded-full overflow-hidden" style={{ height: '4px', background: '#1a1a3a' }}>
            <div style={{ width: `${timerRatio * 100}%`, height: '100%', background: timerColor, transition: 'width 1s linear, background 0.5s' }} />
          </div>
        </div>

        {/* 統計 */}
        <div className="flex gap-8">
          <StatBadge label="WPM" value={wpm} color="#7c6af7" />
          <StatBadge label="ACC" value={accuracy} unit="%" color={accuracy >= 90 ? '#4ade80' : accuracy >= 70 ? '#fbbf24' : '#f87171'} />
          <StatBadge label="完了" value={completedCount} unit="文" color="#64748b" />
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">

        {/* 文表示 */}
        <div className="w-full max-w-3xl mb-10" style={{ minHeight: '5rem' }}>
          <div className="leading-loose text-center select-none"
            style={{ fontFamily: 'Courier New, monospace', fontSize: '1.6rem', letterSpacing: '0.04em' }}>
            {renderSentence()}
          </div>
        </div>

        {/* 入力フィールド */}
        <div className="w-full max-w-2xl relative">
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={isDone}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full px-6 py-5 rounded-xl text-lg outline-none"
            style={{
              background: isDone ? 'rgba(74,222,128,0.06)' : '#12122a',
              border: `2px solid ${isDone ? '#4ade80' : '#2a2a4a'}`,
              color: '#e2e8f0',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '0.08em',
              caretColor: '#7c6af7',
              boxShadow: isDone ? '0 0 24px rgba(74,222,128,0.15)' : '0 4px 32px rgba(0,0,0,0.4)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => { if (!isDone) e.currentTarget.style.borderColor = '#7c6af7' }}
            onBlur={e => { if (!isDone) e.currentTarget.style.borderColor = '#2a2a4a' }}
          />
          {typed.length === 0 && !isDone && (
            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-lg"
              style={{ color: '#2a2a4a', fontFamily: 'Courier New, monospace' }}>
              ここに入力（ひらがなで）...
            </div>
          )}
        </div>

        {/* プログレスバー or Enter プロンプト */}
        {isDone ? (
          <div className="mt-6 text-center"
            style={{ color: '#4ade80', fontFamily: 'Courier New, monospace', fontSize: '1rem', letterSpacing: '0.15em' }}>
            ✓ CLEAR — ↵ Enter で次の文へ
          </div>
        ) : (
          <>
            <div className="w-full max-w-2xl mt-4 rounded-full overflow-hidden"
              style={{ height: '3px', background: '#1a1a3a' }}>
              <div style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #7c6af7, #4ade80)',
                transition: 'width 0.1s',
              }} />
            </div>
            <div className="mt-3 text-xs" style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}>
              {typed.length} / {target.length} 文字
            </div>
          </>
        )}
      </div>
    </div>
  )
}
