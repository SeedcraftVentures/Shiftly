/**
 * EmptyState — Centered empty state with icon, heading, and subtext.
 * @param {object} props
 * @param {React.ComponentType} [props.icon] — Icon component to render
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} [props.action] — Optional action element (e.g. a button)
 */
export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 12,
      }}
    >
      {Icon && (
        <div style={{ color: 'var(--gray-300)', marginBottom: 4 }}>
          <Icon className="w-10 h-10" />
        </div>
      )}
      <h3
        className="heading-subsection"
        style={{ color: 'var(--gray-700)', margin: 0 }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="body-small" style={{ color: 'var(--gray-400)', margin: 0, maxWidth: 320 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}
