import React from 'react'
import { twMerge } from 'tailwind-merge'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  isHoverable?: boolean
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ isHoverable = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge('card', isHoverable && 'card-hover', className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('p-4 border-b border-white/[0.06]', className)}
      {...props}
    >
      {children}
    </div>
  ),
)

CardHeader.displayName = 'CardHeader'

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={twMerge('p-4', className)} {...props}>
      {children}
    </div>
  ),
)

CardBody.displayName = 'CardBody'

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('p-4 border-t border-white/[0.06]', className)}
      {...props}
    >
      {children}
    </div>
  ),
)

CardFooter.displayName = 'CardFooter'
