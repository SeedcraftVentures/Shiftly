export default function SectionHeader({ title, subtitle, action, size = 'default' }) {
    const titleClass = size === 'small' ? 'heading-subsection' : 'heading-section'
    
    return (
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={titleClass}>{title}</h2>
          {subtitle && (
            <p className="body-small text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    )
  }