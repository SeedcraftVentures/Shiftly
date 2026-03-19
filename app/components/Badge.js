export default function Badge({ 
    children, 
    variant = 'default',
    size = 'md',
    icon,
    className = ''
  }) {
    const variants = {
      success: 'badge-success',
      warning: 'badge-warning',
      error: 'badge-error',
      info: 'badge-info',
      default: 'bg-gray-100 text-gray-700',
    }
    
    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-xs px-3 py-1',
      lg: 'text-sm px-4 py-1.5',
    }
    
    const variantClass = variants[variant] || variants.default
    const sizeClass = sizes[size] || sizes.md
    
    return (
      <span className={`badge ${variantClass} ${sizeClass} ${className}`}>
        {icon && <span className="inline-flex items-center">{icon}</span>}
        {children}
      </span>
    )
  }