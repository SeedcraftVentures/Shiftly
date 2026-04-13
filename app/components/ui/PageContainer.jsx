/**
 * PageContainer — Standard centered page wrapper.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.style] — Additional inline styles
 */
export default function PageContainer({ children, style }) {
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '0 24px',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
