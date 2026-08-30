const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

interface PinPadProps {
  filled: number
  error?: boolean
  onKey: (digit: string) => void
  onDelete: () => void
}

/** 4 位 PIN 圆点 + 数字键盘 */
export default function PinPad({ filled, error, onKey, onDelete }: PinPadProps) {
  return (
    <div className="pinpad">
      <div className={`pin-dots ${error ? 'is-error' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot ${i < filled ? 'is-filled' : ''}`} />
        ))}
      </div>
      <div className="pin-keys">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : k === 'del' ? (
            <button key={i} type="button" className="pin-key pin-key-del" onClick={onDelete} aria-label="删除">
              ⌫
            </button>
          ) : (
            <button key={i} type="button" className="pin-key" onClick={() => onKey(k)}>
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
