import { forwardRef } from 'react'

const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
    )}
    <input
      ref={ref}
      className={`
        w-full px-3 py-2.5 text-sm bg-surface border rounded-lg
        placeholder:text-subtle text-ink
        focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
        disabled:bg-canvas disabled:cursor-not-allowed
        transition-colors
        ${error ? 'border-danger focus:ring-danger' : 'border-border'}
        ${className}
      `}
      {...props}
    />
    {error && <p className="text-xs text-danger">{error}</p>}
  </div>
))

Input.displayName = 'Input'
export default Input
