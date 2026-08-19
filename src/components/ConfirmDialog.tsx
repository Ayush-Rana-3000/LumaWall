import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@components/Card'
import { Button } from '@components/Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-md"
      onClick={onCancel}
    >
      <Card
        className="w-full max-w-sm border-white/10 shadow-2xl shadow-black/70 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-500/15 border border-red-500/30'
                  : 'bg-amber-500/15 border border-amber-500/30'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${
                  variant === 'danger' ? 'text-red-400' : 'text-amber-400'
                }`}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-50">{title}</h3>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1">
              {cancelLabel}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              onClick={onConfirm}
              className="flex-1"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
