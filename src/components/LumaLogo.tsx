import React from 'react'
import clsx from 'clsx'

interface LumaLogoProps {
  size?: number
  className?: string
  withGlow?: boolean
}

/**
 * LumaWall brand mark — an abstract flowing "L": a luminous ribbon that
 * drops, sweeps, and launches a trailing light particle. Gradient flows
 * violet → blue → cyan and is legible at 16px.
 */
export const LumaLogo: React.FC<LumaLogoProps> = ({ size = 28, className, withGlow = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(className)}
      role="img"
      aria-label="LumaWall"
    >
      <defs>
        <linearGradient id="lumaLogoStroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#7C3AED" />
          <stop offset="0.45" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="lumaLogoFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="lumaLogoGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7C3AED" stopOpacity="0.9" />
          <stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>

      {withGlow && <circle cx="46" cy="18" r="16" fill="url(#lumaLogoGlow)" opacity="0.35" />}

      {/* Flowing L ribbon: vertical drop → angled sweep */}
      <path
        d="M21 14v27.5a6.5 6.5 0 0 0 6.5 6.5H44"
        stroke="url(#lumaLogoStroke)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Launch particle — the "light" leaving the wall */}
      <circle cx="47" cy="20" r="5.5" fill="url(#lumaLogoFill)" />
      <circle cx="54" cy="13" r="2.5" fill="#06B6D4" opacity="0.8" />
    </svg>
  )
}

/**
 * Full brand lockup: logo + wordmark with "Luma" in light and "Wall"
 * in the aurora gradient.
 */
export const LumaBrand: React.FC<{ size?: number; className?: string }> = ({ size = 26, className }) => {
  return (
    <span className={clsx('inline-flex items-center gap-2.5 select-none', className)}>
      <LumaLogo size={size} />
      <span className="text-xl font-bold tracking-tight leading-none">
        <span className="text-slate-50">Luma</span>
        <span className="text-luma-brand">Wall</span>
      </span>
    </span>
  )
}
