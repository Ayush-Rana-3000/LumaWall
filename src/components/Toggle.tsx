import React from 'react'
import clsx from 'clsx'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  id?: string
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, label, id }) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-luma-violet/50',
        checked ? 'bg-luma-gradient shadow-glowViolet' : 'bg-ink-700/80 border border-white/10',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span
        className={clsx(
          'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
        style={{ height: '18px', width: '18px' }}
      />
    </button>
  )
}
