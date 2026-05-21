import { useState } from 'react'
import SentenceListScreen from './components/SentenceListScreen'
import TypingScreen from './components/TypingScreen'

type Screen = 'list' | 'practice'

export default function App() {
  const [screen, setScreen] = useState<Screen>('list')
  const [sentences, setSentences] = useState<string[]>([])
  const [timeLimit, setTimeLimit] = useState(60)

  function handleStart(s: string[], t: number) {
    setSentences(s)
    setTimeLimit(t)
    setScreen('practice')
  }

  if (screen === 'practice') {
    return (
      <TypingScreen
        sentences={sentences}
        timeLimit={timeLimit}
        onBack={() => setScreen('list')}
      />
    )
  }

  return <SentenceListScreen onStart={handleStart} />
}
