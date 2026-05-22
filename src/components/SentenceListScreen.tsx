import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'anki-typing-sentences'

// Furigana notation: {漢字|よみ} — display text extracted for preview
function getDisplayText(raw: string): string {
  return raw.replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1')
}

const SAMPLE_SENTENCES = [
  // 吾輩は猫である
  '{吾輩|わがはい}は{猫|ねこ}である。{名前|なまえ}はまだない。',
  'どこで{生|う}まれたかとんと{見当|けんとう}がつかぬ。',
  '{何|なに}でも{薄暗|うすぐら}いじめじめした{所|ところ}でニャーニャー{泣|な}いていた{事|こと}だけは{記憶|きおく}している。',
  '{吾輩|わがはい}はここで{始|はじ}めて{人間|にんげん}というものを{見|み}た。',
  '{人間|にんげん}の{中|なか}で{一番|いちばん}{獰悪|どうあく}に{見|み}えた{下女|げじょ}でさえ、{時々|ときどき}{吾輩|わがはい}を{見|み}て{嘆息|たんそく}する{事|こと}がある。',
  // 羅生門
  '{羅生門|らしょうもん}の{下|した}で{雨|あめ}やみを{待|ま}っていた。',
  '{下人|げにん}は、{老婆|ろうば}が{死骸|しがい}につまずきながら、{慌|あわ}てふためいて{逃|に}げようとする{行手|ゆくて}を{塞|ふさ}いだ。',
  'ある{日|ひ}の{暮|く}れ{方|がた}のことである。{一人|ひとり}の{下人|げにん}が、{羅生門|らしょうもん}の{下|した}で{雨|あめ}やみを{待|ま}っていた。',
  '{老婆|ろうば}は、{松明|たいまつ}をそのまま、{石段|いしだん}に{突|つ}き{立|た}てて、それから、{今|いま}まで{眺|なが}めていた{死骸|しがい}を{両手|りょうて}で{扱|こ}き{始|はじ}めた。',
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
  const [showHelp, setShowHelp] = useState(false)
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

  const BtnStyle = {
    base: {
      background: 'transparent',
      border: '1px solid #2a2a4a',
      color: '#4a4a6a',
      fontFamily: 'Courier New, monospace',
      cursor: 'pointer',
    } as React.CSSProperties,
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #0f1729 100%)' }}
    >
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-widest mb-2"
            style={{ color: '#7c6af7', fontFamily: 'Courier New, monospace' }}>
            TYPING MEMORY
          </h1>
          <p className="text-sm tracking-widest" style={{ color: '#4a4a6a' }}>
            暗記タイピング練習
          </p>
        </div>

        {/* Input row */}
        <div className="flex gap-2 mb-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="文を入力して Enter... （フリガナ記法: {漢字|よみ}）"
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
            className="px-5 py-3 rounded-lg font-bold text-sm"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #7c6af7, #5b4fcf)' : '#1a1a3a',
              color: input.trim() ? '#fff' : '#4a4a6a',
              border: 'none',
              fontFamily: 'Courier New, monospace',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            追加
          </button>
        </div>

        {/* Furigana help */}
        <div className="mb-4">
          <button
            onClick={() => setShowHelp(h => !h)}
            className="text-xs px-2 py-1 rounded"
            style={{ ...BtnStyle.base, fontSize: '0.7rem' }}
          >
            {showHelp ? '▾' : '▸'} フリガナ記法について
          </button>
          {showHelp && (
            <div
              className="mt-2 px-4 py-3 rounded-lg text-xs leading-relaxed"
              style={{ background: '#0a0a1e', border: '1px solid #2a2a4a', color: '#7c6af7', fontFamily: 'Courier New, monospace' }}
            >
              <div className="mb-1" style={{ color: '#c8c8e8' }}>漢字にフリガナを付ける形式：</div>
              <div style={{ color: '#4ade80' }}>{'{吾輩|わがはい}'} は {'{猫|ねこ}'} である。</div>
              <div className="mt-2" style={{ color: '#4a4a6a' }}>○ ● ※ などの記号は自動スキップされます。</div>
            </div>
          )}
        </div>

        {/* Sub actions */}
        <div className="flex justify-between items-center mb-3">
          <button onClick={addSamples} className="text-xs px-3 py-1 rounded"
            style={BtnStyle.base}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6af7'; e.currentTarget.style.color = '#7c6af7' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#4a4a6a' }}
          >
            ＋ サンプルを追加（フリガナ付き）
          </button>

          {sentences.length > 0 && (
            <button onClick={clearAll} className="text-xs px-3 py-1 rounded"
              style={BtnStyle.base}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a4a'; e.currentTarget.style.color = '#4a4a6a' }}
            >
              全削除
            </button>
          )}
        </div>

        {/* Sentence list */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ border: '1px solid #2a2a4a', minHeight: '200px' }}>
          {sentences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14"
              style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}>
              <div className="text-3xl mb-3">📝</div>
              <div className="text-sm">文を追加してください</div>
              <div className="text-xs mt-2" style={{ color: '#2a2a4a' }}>または「サンプルを追加」</div>
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {sentences.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? '#12122a' : '#0f0f24',
                    borderBottom: i < sentences.length - 1 ? '1px solid #1a1a3a' : 'none',
                  }}>
                  <span className="text-xs w-6 text-right flex-shrink-0"
                    style={{ color: '#3a3a5a', fontFamily: 'Courier New, monospace' }}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm"
                    style={{
                      color: '#c8c8e8',
                      fontFamily: 'Courier New, monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={getDisplayText(s)}>
                    {getDisplayText(s)}
                  </span>
                  <button onClick={() => deleteSentence(i)}
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 cursor-pointer text-sm"
                    style={{ background: 'transparent', border: 'none', color: '#4a4a6a' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#4a4a6a'; e.currentTarget.style.background = 'transparent' }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Time selection */}
        <div className="mb-6">
          <div className="text-xs tracking-widest mb-3"
            style={{ color: '#4a4a6a', fontFamily: 'Courier New, monospace' }}>
            制限時間
          </div>
          <div className="flex gap-2">
            {TIME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTimeLimit(opt.value)}
                className="flex-1 py-2 rounded-lg text-sm font-bold cursor-pointer"
                style={{
                  background: timeLimit === opt.value ? 'linear-gradient(135deg, #7c6af7, #5b4fcf)' : '#12122a',
                  border: timeLimit === opt.value ? 'none' : '1px solid #2a2a4a',
                  color: timeLimit === opt.value ? '#fff' : '#4a4a6a',
                  fontFamily: 'Courier New, monospace',
                  boxShadow: timeLimit === opt.value ? '0 2px 12px rgba(124,106,247,0.3)' : 'none',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => canStart && onStart(sentences, timeLimit)}
          disabled={!canStart}
          className="w-full py-4 rounded-lg font-bold text-lg tracking-widest"
          style={{
            background: canStart ? 'linear-gradient(135deg, #7c6af7, #5b4fcf)' : '#1a1a3a',
            color: canStart ? '#fff' : '#4a4a6a',
            border: 'none',
            fontFamily: 'Courier New, monospace',
            cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 4px 24px rgba(124,106,247,0.3)' : 'none',
          }}
          onMouseEnter={e => { if (canStart) e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {canStart
            ? `▶ START — ${TIME_OPTIONS.find(t => t.value === timeLimit)?.label} / ${sentences.length}文`
            : '文を追加してください'}
        </button>
      </div>
    </div>
  )
}
