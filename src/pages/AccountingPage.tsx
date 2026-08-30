import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths, format, startOfMonth } from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { db } from '../db/db'
import type { MoneyType, Transaction } from '../db/db'
import { fmtMoney } from '../utils/date'
import Segmented from '../components/Segmented'
import Sheet from '../components/Sheet'
import TransactionForm from '../components/forms/TransactionForm'
import CategoryManager from '../components/CategoryManager'

type View = 'month' | 'year'

const PIE_COLORS = ['#35855a', '#c0504a', '#d9a13b', '#6b5fa8', '#4a7d9d', '#a0722f', '#7a9e3f', '#b85c8a', '#5f8f8b', '#8a6f5c']
const EXPENSE_COLOR = '#c0504a'
const INCOME_COLOR = '#35855a'

function sumBy(list: Transaction[], type: MoneyType): number {
  return list.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0)
}

/** 记账 Tab：月度/年度视图 + 分类占比 + 明细 + 分类管理 */
export default function AccountingPage() {
  const [view, setView] = useState<View>('month')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [pieType, setPieType] = useState<MoneyType>('expense')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [adding, setAdding] = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)

  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const monthKey = format(month, 'yyyy-MM')
  const monthTxs =
    useLiveQuery(() => db.transactions.where('date').startsWith(monthKey).toArray(), [monthKey]) ?? []
  const yearTxsRaw = useLiveQuery(() => db.transactions.where('date').startsWith(String(year)).toArray(), [year])
  const yearTxs = useMemo(() => yearTxsRaw ?? [], [yearTxsRaw])

  const catOf = (id: number) => categories.find((c) => c.id === id)

  // 月度：分类聚合（按 pieType）
  const monthByCategory = useMemo(() => {
    const map = new Map<number, { name: string; icon: string; value: number; txs: Transaction[] }>()
    for (const t of monthTxs) {
      if (t.type !== pieType) continue
      const cat = catOf(t.categoryId)
      const entry = map.get(t.categoryId) ?? {
        name: cat?.name ?? '未分类',
        icon: cat?.icon ?? '📦',
        value: 0,
        txs: [],
      }
      entry.value += t.amount
      entry.txs.push(t)
      map.set(t.categoryId, entry)
    }
    const list = Array.from(map.values())
    list.sort((a, b) => b.value - a.value)
    for (const entry of list) entry.txs.sort((a, b) => (a.date < b.date ? 1 : -1))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthTxs, pieType, categories])

  // 年度：12 个月收支
  const yearSeries = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`
      const list = yearTxs.filter((t) => t.date.startsWith(key))
      return { month: `${i + 1}月`, 支出: sumBy(list, 'expense'), 收入: sumBy(list, 'income') }
    })
  }, [yearTxs, year])

  const monthExpense = sumBy(monthTxs, 'expense')
  const monthIncome = sumBy(monthTxs, 'income')
  const yearExpense = sumBy(yearTxs, 'expense')
  const yearIncome = sumBy(yearTxs, 'income')
  const pieTotal = monthByCategory.reduce((acc, e) => acc + e.value, 0)

  return (
    <div className="page page-money">
      <header className="page-head">
        <h1 className="page-title">记账</h1>
        <button type="button" className="head-action" onClick={() => setShowCatManager(true)}>
          🏷️ 分类管理
        </button>
      </header>

      <Segmented<View>
        options={[
          { value: 'month', label: '月度' },
          { value: 'year', label: '年度' },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'month' ? (
        <>
          <div className="cal-nav">
            <button type="button" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="上个月">
              ‹
            </button>
            <h3>{format(month, 'yyyy年M月')}</h3>
            <button type="button" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="下个月">
              ›
            </button>
          </div>

          <div className="money-summary">
            <div className="money-box">
              <small>支出</small>
              <b className="amount-expense">¥{fmtMoney(monthExpense)}</b>
            </div>
            <div className="money-box">
              <small>收入</small>
              <b className="amount-income">¥{fmtMoney(monthIncome)}</b>
            </div>
            <div className="money-box">
              <small>结余</small>
              <b>¥{fmtMoney(monthIncome - monthExpense)}</b>
            </div>
          </div>

          <div className="money-card">
            <div className="money-card-head">
              <h3>分类占比</h3>
              <Segmented<MoneyType>
                options={[
                  { value: 'expense', label: '支出' },
                  { value: 'income', label: '收入' },
                ]}
                value={pieType}
                onChange={setPieType}
                className="segmented-mini"
              />
            </div>
            {monthByCategory.length === 0 ? (
              <p className="empty-hint">本月还没有{pieType === 'expense' ? '支出' : '收入'}</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={monthByCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {monthByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `¥${fmtMoney(Number(value))}`} />
                  <Legend iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {monthByCategory.map((entry, i) => (
            <section key={`${entry.name}-${i}`} className="money-cat-group">
              <header className="money-cat-head">
                <span>
                  <i className="money-cat-swatch" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {entry.icon} {entry.name}
                  <small className="money-cat-pct">
                    {pieTotal > 0 ? ` ${((entry.value / pieTotal) * 100).toFixed(1)}%` : ''}
                  </small>
                </span>
                <b>¥{fmtMoney(entry.value)}</b>
              </header>
              {entry.txs.map((t) => (
                <button key={t.id} type="button" className="money-tx-row" onClick={() => setEditingTx(t)}>
                  <span>
                    {t.date.slice(5).replace('-', '/')}
                    {t.note && <small className="card-note"> · {t.note}</small>}
                  </span>
                  <b className={t.type === 'expense' ? 'amount-expense' : 'amount-income'}>
                    {t.type === 'expense' ? '-' : '+'}¥{fmtMoney(t.amount)}
                  </b>
                </button>
              ))}
            </section>
          ))}
        </>
      ) : (
        <>
          <div className="cal-nav">
            <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="上一年">
              ‹
            </button>
            <h3>{year}年</h3>
            <button type="button" onClick={() => setYear((y) => y + 1)} aria-label="下一年">
              ›
            </button>
          </div>

          <div className="money-summary">
            <div className="money-box">
              <small>全年支出</small>
              <b className="amount-expense">¥{fmtMoney(yearExpense)}</b>
            </div>
            <div className="money-box">
              <small>全年收入</small>
              <b className="amount-income">¥{fmtMoney(yearIncome)}</b>
            </div>
            <div className="money-box">
              <small>结余</small>
              <b>¥{fmtMoney(yearIncome - yearExpense)}</b>
            </div>
          </div>

          <div className="money-card">
            <h3>12 个月收支趋势</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={yearSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => `¥${fmtMoney(Number(value))}`} />
                <Legend iconSize={10} />
                <Bar dataKey="支出" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} />
                <Bar dataKey="收入" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <button type="button" className="money-add" onClick={() => setAdding(true)}>
        ＋ 记一笔
      </button>

      {adding && (
        <Sheet title="记一笔" onClose={() => setAdding(false)}>
          <TransactionForm onDone={() => setAdding(false)} />
        </Sheet>
      )}

      {editingTx && (
        <Sheet title="编辑账目" onClose={() => setEditingTx(null)}>
          <TransactionForm
            initial={editingTx}
            onDone={() => setEditingTx(null)}
            onDelete={async () => {
              if (!window.confirm('确定删除这笔账目吗？')) return
              await db.transactions.delete(editingTx.id!)
              setEditingTx(null)
            }}
          />
        </Sheet>
      )}

      {showCatManager && <CategoryManager onClose={() => setShowCatManager(false)} />}
    </div>
  )
}
