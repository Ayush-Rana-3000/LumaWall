import React from 'react'

interface SliderProps {
  label?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
  display?: string
  disabled?: boolean
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  display,
  disabled,
}) => {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : undefined}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-300">{label}</span>
          <span className="text-sm font-semibold text-white tabular-nums">
            {display ?? value}
            {unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-premium"
        style={{
          background: `linear-gradient(to right, #7C3AED 0%, #3B82F6 ${pct}%, rgba(30,42,68,0.8) ${pct}%, rgba(30,42,68,0.8) 100%)`,
        }}
      />
    </div>
  )
}
