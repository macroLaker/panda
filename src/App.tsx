import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PinLock from './components/PinLock'
import { getSetting } from './db/db'
import { PIN_HASH_KEY, SESSION_UNLOCK_KEY } from './utils/pin'
import TimelinePage from './pages/TimelinePage'
import AccountingPage from './pages/AccountingPage'
import TodosPage from './pages/TodosPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  // null = 正在检查 PIN 状态
  const [locked, setLocked] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    getSetting(PIN_HASH_KEY).then((hash) => {
      if (cancelled) return
      setLocked(!!hash && sessionStorage.getItem(SESSION_UNLOCK_KEY) !== '1')
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (locked === null) {
    return <div className="boot-splash">🐼</div>
  }

  if (locked) {
    return (
      <PinLock
        onUnlock={() => {
          sessionStorage.setItem(SESSION_UNLOCK_KEY, '1')
          setLocked(false)
        }}
      />
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/timeline" replace />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/money" element={<AccountingPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/timeline" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
