import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Sheet from './Sheet'
import EventForm from './forms/EventForm'
import DiaryForm from './forms/DiaryForm'
import ThoughtForm from './forms/ThoughtForm'
import TransactionForm from './forms/TransactionForm'
import TodoForm from './forms/TodoForm'
import type { Kind } from '../utils/timeline'

const TAB_ICONS: Record<string, JSX.Element> = {
  timeline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M7 5l5 6 5-6" />
      <path d="M12 11v8M8.5 13.5h7M8.5 16.5h7" />
    </svg>
  ),
  todos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18" />
    </svg>
  ),
}

const COMPOSE_OPTIONS: { type: Kind; label: string; desc: string; icon: string }[] = [
  { type: 'event', label: '事件', desc: '记录一段起止时间', icon: '⏱' },
  { type: 'diary', label: '日记', desc: '写下今天的故事', icon: '📔' },
  { type: 'thought', label: '感悟', desc: '灵光一闪随手记', icon: '💡' },
  { type: 'transaction', label: '记账', desc: '记一笔收支', icon: '💰' },
  { type: 'todo', label: '待办', desc: '添加一件要做的事', icon: '✅' },
]

const COMPOSE_TITLES: Record<Kind, string> = {
  event: '记录事件',
  diary: '写日记',
  thought: '记感悟',
  transaction: '记一笔',
  todo: '添加待办',
}

/** 应用外壳：页面出口 + 底部 Tab + 全局 ➕ */
export default function Layout() {
  const [fabOpen, setFabOpen] = useState(false)
  const [compose, setCompose] = useState<Kind | null>(null)

  const closeCompose = () => setCompose(null)

  return (
    <div className="app">
      <main className="app-main">
        <Outlet />
      </main>

      <nav className="tabbar">
        <NavLink to="/timeline" className="tab">
          {TAB_ICONS.timeline}
          <span>时间线</span>
        </NavLink>
        <NavLink to="/money" className="tab">
          {TAB_ICONS.money}
          <span>记账</span>
        </NavLink>
        <span className="tab-fab-slot" aria-hidden />
        <NavLink to="/todos" className="tab">
          {TAB_ICONS.todos}
          <span>待办</span>
        </NavLink>
        <NavLink to="/settings" className="tab">
          {TAB_ICONS.settings}
          <span>设置</span>
        </NavLink>
      </nav>

      <button
        type="button"
        className={`fab ${fabOpen ? 'is-open' : ''}`}
        aria-label="添加记录"
        onClick={() => setFabOpen((v) => !v)}
      >
        ＋
      </button>

      {fabOpen && (
        <div className="fab-menu-backdrop" onClick={() => setFabOpen(false)}>
          <div className="fab-menu" onClick={(e) => e.stopPropagation()}>
            {COMPOSE_OPTIONS.map((opt, i) => (
              <button
                key={opt.type}
                type="button"
                className="fab-menu-item"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => {
                  setFabOpen(false)
                  setCompose(opt.type)
                }}
              >
                <span className="fab-menu-icon">{opt.icon}</span>
                <span className="fab-menu-text">
                  <b>{opt.label}</b>
                  <small>{opt.desc}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {compose && (
        <Sheet title={COMPOSE_TITLES[compose]} onClose={closeCompose}>
          {compose === 'event' && <EventForm onDone={closeCompose} />}
          {compose === 'diary' && <DiaryForm onDone={closeCompose} />}
          {compose === 'thought' && <ThoughtForm onDone={closeCompose} />}
          {compose === 'transaction' && <TransactionForm onDone={closeCompose} />}
          {compose === 'todo' && <TodoForm onDone={closeCompose} />}
        </Sheet>
      )}
    </div>
  )
}
