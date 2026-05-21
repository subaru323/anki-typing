import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'anki-typing-sentences'

const SAMPLE_SENTENCES = [
  '吾輩は猫である。名前はまだない。',
  'どこで生れたかとんと見当がつかぬ。',
  '何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。',
  '吾輩はここで始めて人間というものを見た。',
  '羅生門の下で雨やみを待っていた。',
  '下人は、老婆が死骸につまずきながら、慌てふためいて逃げようとする行手を塞いだ。',
  'ある日の暮れ方のことである。',
]

const TIME_OPTIONS = [
  { label: '30秒', value: 30 },
  { label: '1分', value: 60 },
  { label: '2分', value: 120 },
  { label: '3分', value: 180 },
]

interface Props {
  onStart: (sentences: string[], timeLimit: number) => void
}

export default function SentenceListScreen({ onStart }: Props) {
  const [sentences, setSentences] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [timeLimit, setTimeLimit] = useState(60)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sentences))
  }, [sentences])

  function addSentence() {
    const trimmed = input.trim()
    if (!trimmed) return
    setSentences(prev => [...prev, trimmed])
    setInput('')
    inputRef.current?.focus()
  }

  function deleteSentence(index: number) {
    setSentences(prev => prev.filter((_, i) => i !== index))
  }

  function clearAll() {
    if (confirm('全ての文を削除しますか？')) setSentences([])
  }

  function addSamples() {
    setSentences(prev => {
      const existing = new Set(prev)
      const toAdd = SAMPLE_SENTENCES.filter(s => !existing.has(s))
      return [...prev, ...toAdd]
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addSentence()
  }

  const canStart = sentences.length > 0

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #0f1729 100%)' }}
    >
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-4xl font-bold tracking-widest mb-2"
            style={{ color: '#7c6af7', fontFamily: 'Courier New, monospace' }}
          >
            TYPING MEMORY
          </h1>
          <p className="text-sm tracking-widest" style={{ color: '#4a4a6a' }}>
            暗記タイピング練習
          </p>
        </div>

        {/* Input row */}
        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="練習したい文を入力して Enter..."
            className="flex-1 px-4 py-3 rounded-lg outline-none text-sm"
            style={{
              background: '#12122a',
              border: '1px solid #2a2a4a',
              color: '#c8c8e8',
              fontFamily: 'Courier New, monospace',
              caretColor: '#7c6af7',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#7c6af7' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#2a2a4a' }}
          />
          <button
            onClick={addSentence}
            disabled={!input.trim()}
            className="px-5 py-3 rounded-lg font-bold text-sm cursor-pointer transition-all"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #7c6af7, #5b4fcf)' : '#1a1a3a',
              color: input.trim() ? '#fff' : '#4a4a6a',
              border: 'none',
              fontFamily: 'Courier New, monospace',
            }}
          >
            追加
          </button>
        </div>

        {/* Sub actions */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={addSamples}
            className="text-xs px-3 py-1 rounded cursor-pointer transition-colors"
            style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6af7'; e.currentTarget.style.color = '#7c6af7' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#4a4a6a' }}
          >
            ＋ サンプルを追加
          </button>

          {sentences.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs px-3 py-1 rounded cursor-pointer transition-colors"
              style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#4a4a6a' }}
            >
              全削除
            </button>
          )}
        </div>

        {/* Sentence list */}
        <div
          className="rounded-xl overflow-hidden mb-6"
          style={{ border: '1px solid #2a2a4a', minHeight: '200px' }}
        >
          {sentences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14" style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}>
              <div className="text-3xl mb-3">📝</div>
              <div className="text-sm">文を追加してください</div>
              <div className="text-xs mt-2" style={{ color: '#2a2a4a' }}>または「サンプルを追加」</div>
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {sentences.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? '#12122a' : '#0f0f24',
                    borderBottom: i < sentences.length - 1 ? '1px solid #1a1a3a' : 'none',
                  }}
                >
                  <span
                    className="text-xs w-6 text-right flex-shrink-0"
                    style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: '#c8c8e8',
                      fontFamily: 'Courier New, monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={s}
                  >
                    {s}
                  </span>
                  <button
                    onClick={() => deleteSentence(i)}
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 cursor-pointer text-sm"
                    style={{ background: 'transparent', border: 'none', color: '#4a4a6a' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.background = 'transparent' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time selection */}
        <div className="mb-6">
          <div
            className="text-xs tracking-widest mb-3"
            style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}
          >
            制限時間
          </div>
          <div className="flex gap-2">
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimeLimit(opt.value)}
                className="flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all"
                style={{
                  background: timeLimit === opt.value ? 'linear-gradient(135deg, #7c6af7, #5b4fcf)' : '#12122a',
                  border: timeLimit === opt.value ? 'none' : '1px solid #2a2a4a',
                  color: timeLimit === opt.value ? '#fff' : '#4a4a6a',
                  fontFamily: 'Courier New, monospace',
                  boxShadow: timeLimit === opt.value ? '0 2px 12px rgba(124,106,247,0.3)' : 'none',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => canStart && onStart(sentences, timeLimit)}
          disabled={!canStart}
          className="w-full py-4 rounded-lg font-bold text-lg tracking-widest transition-all"
          style={{
            background: canStart ? 'linear-gradient(135deg, #7c6af7, #5b4fcf)' : '#1a1a3a',
            color: canStart ? '#fff' : '#4a4a6a',
            border: 'none',
            fontFamily: 'Courier New, monospace',
            cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 4px 24px rgba(124,106,247,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (canStart) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,106,247,0.5)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = canStart ? '0 4px 24px rgba(124,106,247,0.3)' : 'none' }}
        >
          {canStart
            ? `▶ START — ${TIME_OPTIONS.find(t => t.value === timeLimit)?.label} / ${sentences.length}文`
            : '文を追加してください'}
        </button>
      </div>
    </div>
  )
}
