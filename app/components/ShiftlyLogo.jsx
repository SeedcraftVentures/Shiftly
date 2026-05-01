import Image from 'next/image'

/**
 * Shiftly Logo Component - Standardized lockup with color variants
 *
 * @param {Object} props
 * @param {'default'|'pink'|'white'|'onboarding'} [props.variant] - 'default' (gray on white), 'pink' (pink on white), 'white' (white on dark), 'onboarding' (large gray)
 * @param {'sm'|'md'|'lg'|'xl'} [props.size]
 * @param {boolean} [props.showPillbox] - Whether to show the white pillbox container
 * @param {string|null} [props.businessName] - Optional business name to show below (mobile only)
 * @returns {JSX.Element}
 */
export default function ShiftlyLogo({ 
  variant = 'default', 
  size = 'md',
  showPillbox = true,
  businessName = null 
}) {
  
  // Size configurations
  const sizes = {
    sm: { logo: 28, text: 'text-lg', gap: 'gap-2', padding: 'px-4 py-2' },
    md: { logo: 40, text: 'text-2xl', gap: 'gap-2', padding: 'px-5 py-3' },
    lg: { logo: 52, text: 'text-3xl', gap: 'gap-2.5', padding: 'px-7 py-4' },
    xl: { logo: 64, text: 'text-4xl', gap: 'gap-3', padding: 'px-8 py-5' }
  }

  // Color variants
  const variants = {
    default: {
      logoSrc: '/logo.svg',
      textColor: 'text-gray-900',
      pillboxBg: 'bg-white',
      shadow: 'shadow-lg'
    },
    pink: {
      logoSrc: '/logo.svg',
      textColor: 'text-[#FF1F7D]',
      pillboxBg: 'bg-white',
      shadow: 'shadow-lg'
    },
    white: {
      logoSrc: '/logo-white.svg',
      textColor: 'text-white',
      pillboxBg: 'bg-transparent',
      shadow: ''
    },
    onboarding: {
      logoSrc: '/logo.svg',
      textColor: 'text-gray-900',
      pillboxBg: 'bg-white',
      shadow: 'shadow-lg'
    }
  }

  const config = sizes[size]
  const colors = variants[variant]

  const content = (
    <div className="flex items-center" style={{ gap: config.gap }}>
      <Image 
        src={colors.logoSrc}
        alt="Shiftly" 
        width={config.logo} 
        height={config.logo}
        className="flex-shrink-0"
      />
      <div className="flex flex-col">
        <span 
          className={`${colors.textColor} font-bold ${config.text} leading-tight mt-0.5`}
          style={{ fontFamily: "'Cal Sans', sans-serif" }}
        >
          Shiftly
        </span>
        {businessName && (
          <span className="text-gray-600 text-xs -mt-0.5">{businessName}</span>
        )}
      </div>
    </div>
  )

  if (!showPillbox || variant === 'white') {
    return content
  }

  return (
    <div className={`inline-flex items-center ${config.padding} ${colors.pillboxBg} ${colors.shadow} rounded-2xl`}>
      {content}
    </div>
  )
}