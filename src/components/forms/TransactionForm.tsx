import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { MoneyType, Transaction } from '../../db/db'
import { nowISO, todayStr } from '../../utils/date'
import { alertWriteError } from '../../utils/errors'
import Segmented from '../Segmented'

interface TransactionFormProps {
  initial?: Transaction
  onDone: () => void
  onDelete?: () => void
}

/** 记账录入/编辑：类型 → 金额 → 分类宫格 → 备注 → 日期 */
export default function TransactionForm({ initial, onDone, onDelete }: TransactionFormProps) {
  const [type, setType] = useState<MoneyType>(initial?.type ?? 'expense')
  const [amountText, setAmountText] = useState(initial ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [date, setDate] = useState(initial?.date ?? todayStr())
  const [error, setError] = useState('')

  const categories = useLiveQuery(
    () => db.categories.where('type').equals(type).sortBy('sortOrder'),
    [type],
  )

  const save = async () => {
    const amount = Number(amountText)
    if (!amountText || !Number.isFinite(amount) || amount <= 0) {
      setError('请输入大于 0 的金额')
      return
    }
    if (categoryId == null) {
      setError('请选择一个分类')
      return
    }
    const rounded = Math.round(amount * 100) / 100
    try {
      if (initial?.id != null) {
        await db.transactions.update(initial.id, { type, amount: rounded, categoryId, note: note.trim(), date })
      } else {
        await db.transactions.add({ type, amount: rounded, categoryId, note: note.trim(), date, createdAt: nowISO() })
      }
    } catch (err) {
      alertWriteError(err)
      return
    }
    onDone()
  }

  return (
    <div className="form">
      <Segmented<MoneyType>
        options={[
          { value: 'expense', label: '支出' },
          { value: 'income', label: '收入' },
        ]}
        value={type}
        onChange={(t) => {
          setType(t)
          setCategoryId(null)
        }}
      />
      <label className="form-field">
        <span>金额</span>
        <input
          className="amount-input"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amountText}
          onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ''))}
          autoFocus={!initial}
        />
      </label>
      <div className="form-field">
        <span>分类</span>
        <div className="cat-grid">
          {(categories ?? []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-cell ${cat.id === categoryId ? 'is-selected' : ''}`}
              onClick={() => setCategoryId(cat.id!)}
            >
              <em>{cat.icon}</em>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
      <label className="form-field">
        <span>备注（可选）</span>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：和同事吃午饭" />
      </label>
      <label className="form-field">
        <span>日期</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-primary" onClick={save}>
        保存
      </button>
      {onDelete && (
        <button type="button" className="btn-danger-ghost" onClick={onDelete}>
          删除这笔账目
        </button>
      )}
    </div>
  )
}
