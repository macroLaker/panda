import type { ReactNode } from 'react'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** 底部弹层，移动端表单/详情统一容器 */
export default function Sheet({ title, onClose, children }: SheetProps) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <span className="sheet-grip" aria-hidden />
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
