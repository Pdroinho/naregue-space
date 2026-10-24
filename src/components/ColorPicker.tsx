import { useEffect, useId, useState, type CSSProperties } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

const colorPresets = ['#d9743c', '#347a8a', '#a6463e', '#a9673f', '#4d6570', '#7d684e', '#5f6955']

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [text, setText] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()

  useEffect(() => {
    setText(value)
    setError(null)
  }, [value])

  function isValidHexColor(s: string) {
    const v = s.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(v)) return true
    if (/^#[0-9a-f]{3}$/.test(v)) return true
    return false
  }

  function normalizeHexColor(s: string) {
    const raw = s.trim().toLowerCase()
    const v = raw.startsWith('#') ? raw : `#${raw}`
    return v
  }

  function applyHexColor(next: string) {
    const normalized = normalizeHexColor(next)
    if (!isValidHexColor(normalized)) {
      setError('Cor inválida (use #RGB ou #RRGGBB)')
      return
    }
    setError(null)
    setText(normalized)
    onChange(normalized)
  }

  return (
    <div className="nr-color-picker">
      <div className="nr-color-presets" aria-label="Cores sugeridas">
      {colorPresets.map(c => (
        <button
          type="button"
          key={c}
          onClick={() => onChange(c)}
          aria-label={`Usar a cor ${c}`}
          aria-pressed={value === c}
          className={`color-preset${value === c ? ' is-selected' : ''}`}
          style={{ '--preset-color': c } as CSSProperties}
        />
      ))}
      </div>
      <div className="nr-color-custom">
        <div className="nr-color-custom-row">
          <label className="btn nr-color-custom-trigger">
              <span className="nr-color-preview" style={{ '--preview-color': value } as CSSProperties} />
              <span>Outra cor</span>
            <input
              aria-label="Escolher cor"
              type="color"
              value={value}
              onChange={(e) => {
                setError(null)
                onChange(e.target.value)
              }}
            />
          </label>
          
          <div className="nr-color-divider" />

          <div className="nr-color-hex-field">
            <input
              className="input"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyHexColor(text)
              }}
              onBlur={() => applyHexColor(text)}
              inputMode="text"
              placeholder="#d9743c"
              aria-label="Cor em hexadecimal"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
        </div>
        {error && <div className="nr-color-error" id={errorId} role="alert">{error}</div>}
      </div>
    </div>
  )
}
