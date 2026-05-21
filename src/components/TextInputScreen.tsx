import { useState } from 'react'

interface Props {
  onPlay: (text: string) => void
}

const SAMPLE = `吾輩は猫である。名前はまだない。
どこで生れたかとんと見当がつかぬ。
何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。
吾輩はここで始めて人間というものを見た。`

export default function TextInputScreen({ onPlay }: Props) {
  const [text, setText] = useState('')

  function handlePlay() {
    const target = text.trim() || SAMPLE
    onPlay(target)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'linear-gradient(135deg, #0d0d1a 0%, #0f1729 100%)' }}>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-widest mb-2"
            style={{ color: '#7c6af7', fontFamily: 'Courier New, monospace' }}>
            TYPING MEMORY
          </h1>
          <p className="text-sm tracking-widest" style={{ color: '#4a4a6a' }}>
            暗記タイピング練習
          </p>
        </div>

        {/* Textarea */}
        <div className="relative mb-6">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={SAMPLE}
            rows={8}
            className="w-full rounded-lg px-5 py-4 text-sm leading-relaxed resize-none outline-none transition-all"
            style={{
              background: '#12122a',
              border: '1px solid #2a2a4a',
              color: '#c8c8e8',
              fontFamily: 'Courier New, monospace',
              caretColor: '#7c6af7',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#7c6af7'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,106,247,0.2)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#2a2a4a'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <div className="absolute bottom-3 right-4 text-xs" style={{ color: '#3a3a5a' }}>
            句点（。）または改行で文を分割します
          </div>
        </div>

        {/* Play button */}
        <button
          onClick={handlePlay}
          className="w-full py-4 rounded-lg font-bold text-lg tracking-widest transition-all duration-200 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #7c6af7, #5b4fcf)',
            color: '#fff',
            fontFamily: 'Courier New, monospace',
            border: 'none',
            boxShadow: '0 4px 24px rgba(124,106,247,0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,106,247,0.5)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,106,247,0.3)'
          }}
        >
          ▶ PLAY
        </button>

        <p className="text-center text-xs mt-4" style={{ color: '#3a3a5a' }}>
          テキストが空の場合はサンプル文で練習します
        </p>
      </div>
    </div>
  )
}
