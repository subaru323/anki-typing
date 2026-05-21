import { useState } from 'react'
import TextInputScreen from './components/TextInputScreen'
import TypingScreen from './components/TypingScreen'

type Screen = 'input' | 'practice'

export default function App() {
  const [screen, setScreen] = useState<Screen>('input')
  const [sentences, setSentences] = useState<string[]>([])

  function handlePlay(text: string) {
    const raw = text
      .split(/[。\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    setSentences(raw)
    setScreen('practice')
  }

  function handleBack() {
    setScreen('input')
  }

  if (screen === 'practice' && sentences.length > 0) {
    return <TypingScreen sentences={sentences} onBack={handleBack} />
  }

  return <TextInputScreen onPlay={handlePlay} />
}
