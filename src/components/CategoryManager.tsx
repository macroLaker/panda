import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Category, MoneyType } from '../db/db'
import Sheet from './Sheet'

interface CategoryManagerProps {
  onClose: () => void
}

interface EditingState {
  id: number | null // null = 新增
  type: MoneyType
  name: string
  icon: string
}

/** 记账分类管理：增删改 + 上下排序 */
export default function CategoryManager({ onClose }: CategoryManagerProps) {
  const [editing, setEditing] = useState<EditingState | null>(null)
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const listOf = (type: MoneyType) =>
    categories.filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder)

  const move = async (cat: Category, dir: -1 | 1) => {
    const list = listOf(cat.type)
    const index = list.findIndex((c) => c.id === cat.id)
    const neighbor = list[index + dir]
    if (!neighbor) return
    await db.transaction('rw', db.categories, async () => {
      await db.categories.update(cat.id!, { sortOrder: neighbor.sortOrder })
      await db.categories.update(neighbor.id!, { sortOrder: cat.sortOrder })
    })
  }

  const remove = async (cat: Category) => {
    if (!window.confirm(`确定删除分类「${cat.name}」吗？已记的账目会显示为“未分类”。`)) return
    await db.categories.delete(cat.id!)
  }

  const saveEditing = async () => {
    if (!editing) return
    const name = editing.name.trim()
    const icon = editing.icon.trim() || '🏷️'
    if (!name) return
    if (editing.id != null) {
      await db.categories.update(editing.id, { name, icon })
    } else {
      const list = listOf(editing.type)
      const sortOrder = list.length > 0 ? list[list.length - 1].sortOrder + 1 : 0
      await db.categories.add({ name, icon, type: editing.type, sortOrder })
    }
    setEditing(null)
  }

  const renderEditor = () => (
    <div className="cat-editor">
      <input
        type="text"
        className="cat-editor-icon"
        value={editing!.icon}
        maxLength={4}
        placeholder="🏷️"
        onChange={(e) => setEditing({ ...editing!, icon: e.target.value })}
      />
      <input
        type="text"
        className="cat-editor-name"
        value={editing!.name}
        maxLength={8}
        placeholder="分类名"
        autoFocus
        onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
      />
      <button type="button" className="btn-mini btn-mini-primary" onClick={saveEditing}>
        保存
      </button>
      <button type="button" className="btn-mini" onClick={() => setEditing(null)}>
        取消
      </button>
    </div>
  )

  const renderSection = (type: MoneyType, title: string) => {
    const list = listOf(type)
    return (
      <section className="cat-section">
        <h3>{title}</h3>
        {list.map((cat, i) => (
          <div key={cat.id} className="cat-row">
            {editing?.id === cat.id ? (
              renderEditor()
            ) : (
              <>
                <span className="cat-row-label">
                  <em>{cat.icon}</em> {cat.name}
                </span>
                <span className="cat-row-actions">
                  <button type="button" className="btn-mini" disabled={i === 0} onClick={() => move(cat, -1)} aria-label="上移">
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-mini"
                    disabled={i === list.length - 1}
                    onClick={() => move(cat, 1)}
                    aria-label="下移"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn-mini"
                    onClick={() => setEditing({ id: cat.id!, type, name: cat.name, icon: cat.icon })}
                  >
                    编辑
                  </button>
                  <button type="button" className="btn-mini btn-mini-danger" onClick={() => remove(cat)}>
                    删除
                  </button>
                </span>
              </>
            )}
          </div>
        ))}
        {editing?.id === null && editing.type === type ? (
          <div className="cat-row">{renderEditor()}</div>
        ) : (
          <button
            type="button"
            className="cat-add"
            onClick={() => setEditing({ id: null, type, name: '', icon: '' })}
          >
            ＋ 添加{title}分类
          </button>
        )}
      </section>
    )
  }

  return (
    <Sheet title="分类管理" onClose={onClose}>
      {renderSection('expense', '支出')}
      {renderSection('income', '收入')}
    </Sheet>
  )
}
