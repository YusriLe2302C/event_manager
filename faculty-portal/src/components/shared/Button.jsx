import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary: 'bg-canvas text-ink border border-border hover:bg-border',
  danger:    'bg-danger text-white hover:bg-red-700 focus-visible:ring-red-400',
  ghost:     'text-ink-soft hover:bg-canvas',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => (
  <button
    disabled={disabled || loading}
    className={`
      inline-flex items-center justify-center gap-2 font-medium rounded-lg
      transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      ${VARIANTS[variant]} ${SIZES[size]} ${className}
    `}
    {...props}
  >
    {loading && <Loader2 size={14} className="animate-spin" />}
    {children}
  </button>
)

export default Button
