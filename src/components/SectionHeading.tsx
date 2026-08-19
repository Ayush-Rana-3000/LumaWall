import React from 'react'
import clsx from 'clsx'

interface SectionHeadingProps {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}) => {
  return (
    <div className={clsx('flex flex-col sm:flex-row sm:items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-luma-violetLight mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl md:text-[2.4rem] font-bold tracking-tight text-slate-50 leading-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-slate-400 text-[15px] leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  )
}
