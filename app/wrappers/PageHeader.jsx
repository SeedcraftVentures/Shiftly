export default function PageHeader({ title, subtitle, action, backLink }) {
  return (
    <div className="mb-6">
      {backLink && (
        <a 
          href={backLink.href} 
          className="inline-flex items-center gap-2 text-sm font-medium mb-3 transition-colors text-pink-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLink.label || 'Back'}
        </a>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-page mb-1">{title}</h1>
          {subtitle && (
            <p className="body-small text-gray-500">{subtitle}</p>
          )}
        </div>
        
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}