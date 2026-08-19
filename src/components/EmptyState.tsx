import React from 'react'
import { LumaLogo } from '@components/LumaLogo'

interface EmptyStateProps {
  title: string
  description: string
  actions?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actions, className }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center text-center px-6 py-20 ${className ?? ''}`}>
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-luma-violet/30 blur-2xl scale-150" aria-hidden />
        <div className="relative w-16 h-16 rounded-2xl glass flex items-center justify-center animate-float-slow">
          <LumaLogo size={36} />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-slate-50 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">{description}</p>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
