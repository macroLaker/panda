import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Todo, TodoScope } from '../db/db'
import { fmtTime, monthStartStr, nowISO, todayStr, weekStartStr } from '../utils/date'
import Segmented from '../components/Segmented'
import Sheet from '../components/Sheet'
import TodoForm from '../components/forms/TodoForm'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const
const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' } as const

function sortTodos(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (rank !== 0) return rank
    return a.createdAt < b.createdAt ? -1 : 1
  })
}

/** 待办 Tab：今天 / 本周 / 本月 三个分段 */
export default function TodosPage() {
  const [scope, setScope] = useState<TodoScope>('day')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [adding, setAdding] = useState(false)

  const todosRaw = useLiveQuery(() => db.todos.toArray(), [])
  const todos = useMemo(() => todosRaw ?? [], [todosRaw])

  const today = todayStr()
  const thisWeek = weekStartStr()
  const thisMonth = monthStartStr()

  // day 粒度：未完成的始终顺延显示在「今天」；已完成的只在完成当天出现
  const currentList = useMemo(() => {
    if (scope === 'day') {
      return sortTodos(
        todos.filter((t) => t.scope === 'day' && (!t.done || (t.doneAt ?? '').startsWith(today))),
      )
    }
    const start = scope === 'week' ? thisWeek : thisMonth
    return sortTodos(todos.filter((t) => t.scope === scope && t.scopeDate === start))
  }, [todos, scope, today, thisWeek, thisMonth])

  // 上周/上月未完成 → 提示区
  const overdueList = useMemo(() => {
    if (scope === 'day') return []
    const start = scope === 'week' ? thisWeek : thisMonth
    return sortTodos(todos.filter((t) => t.scope === scope && !t.done && t.scopeDate < start))
  }, [todos, scope, thisWeek, thisMonth])

  const toggleDone = async (todo: Todo) => {
    if (todo.done) {
      await db.todos.update(todo.id!, { done: false, doneAt: undefined })
    } else {
      await db.todos.update(todo.id!, { done: true, doneAt: nowISO() })
    }
  }

  const moveToCurrent = async (todo: Todo) => {
    const start = todo.scope === 'week' ? thisWeek : thisMonth
    await db.todos.update(todo.id!, { scopeDate: start })
  }

  const moveAllToCurrent = async () => {
    const start = scope === 'week' ? thisWeek : thisMonth
    await Promise.all(overdueList.map((t) => db.todos.update(t.id!, { scopeDate: start })))
  }

  const removeTodo = async (todo: Todo) => {
    if (!window.confirm('确定删除这条待办吗？')) return
    await db.todos.delete(todo.id!)
  }

  const renderRow = (todo: Todo) => (
    <div key={todo.id} className={`todo-row ${todo.done ? 'is-done' : ''}`}>
      <button
        type="button"
        className={`todo-check prio-border-${todo.priority} ${todo.done ? 'is-checked' : ''}`}
        aria-label={todo.done ? '标记未完成' : '标记完成'}
        onClick={() => toggleDone(todo)}
      >
        {todo.done ? '✓' : ''}
      </button>
      <button type="button" className="todo-body" onClick={() => setEditing(todo)}>
        <span className="todo-content">{todo.content}</span>
        <small className="todo-meta">
          <span className={`prio-dot prio-${todo.priority}`} />
          {PRIORITY_LABEL[todo.priority]}优先级
          {todo.done && todo.doneAt ? ` · ${todo.doneAt.slice(5, 10).replace('-', '/')} ${fmtTime(todo.doneAt)} 完成` : ''}
        </small>
      </button>
    </div>
  )

  const scopeLabel = scope === 'week' ? '上周' : '上月'
  const currentLabel = scope === 'week' ? '本周' : '本月'

  return (
    <div className="page page-todos">
      <header className="page-head">
        <h1 className="page-title">待办</h1>
        <button type="button" className="head-action" onClick={() => setAdding(true)}>
          ＋ 新增
        </button>
      </header>

      <Segmented<TodoScope>
        options={[
          { value: 'day', label: '今天' },
          { value: 'week', label: '本周' },
          { value: 'month', label: '本月' },
        ]}
        value={scope}
        onChange={setScope}
      />

      {overdueList.length > 0 && (
        <div className="overdue-box">
          <header className="overdue-head">
            <span>
              ⏳ {scopeLabel}还有 {overdueList.length} 件未完成
            </span>
            <button type="button" className="btn-mini btn-mini-primary" onClick={moveAllToCurrent}>
              全部移入{currentLabel}
            </button>
          </header>
          {overdueList.map((todo) => (
            <div key={todo.id} className="overdue-row">
              <span className="overdue-content">
                <span className={`prio-dot prio-${todo.priority}`} />
                {todo.content}
              </span>
              <span className="cat-row-actions">
                <button type="button" className="btn-mini" onClick={() => moveToCurrent(todo)}>
                  移入{currentLabel}
                </button>
                <button type="button" className="btn-mini btn-mini-danger" onClick={() => removeTodo(todo)}>
                  删除
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {currentList.length === 0 ? (
        <div className="empty-state">
          <span className="empty-panda">🎋</span>
          <p>{scope === 'day' ? '今天' : currentLabel}还没有待办，享受轻松时光</p>
        </div>
      ) : (
        <div className="todo-list">{currentList.map(renderRow)}</div>
      )}

      {adding && (
        <Sheet title="添加待办" onClose={() => setAdding(false)}>
          <TodoForm onDone={() => setAdding(false)} />
        </Sheet>
      )}

      {editing && (
        <Sheet title="编辑待办" onClose={() => setEditing(null)}>
          <TodoForm
            initial={editing}
            onDone={() => setEditing(null)}
            onDelete={async () => {
              if (!window.confirm('确定删除这条待办吗？')) return
              await db.todos.delete(editing.id!)
              setEditing(null)
            }}
          />
        </Sheet>
      )}
    </div>
  )
}
