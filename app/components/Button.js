export default function Button({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    disabled = false,
    loading = false,
    onClick,
    type = 'button',
    className = '',
    icon,
    iconPosition = 'left'
  }) {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'btn-primary text-white hover:shadow-lg hover:shadow-pink-500/25 focus-visible:ring-pink-500',
      secondary: 'btn-secondary bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 focus-visible:ring-pink-500',
      danger: 'btn-danger text-white hover:shadow-lg focus-visible:ring-red-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
      link: 'bg-transparent hover:bg-transparent underline-offset-4 hover:underline focus-visible:ring-pink-500',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    }
    
    const variantClass = variants[variant] || variants.primary
    const sizeClass = sizes[size] || sizes.md
    
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </button>
    )
  }