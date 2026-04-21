export default function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600,
        color: 'var(--gray-500)', marginBottom: 4,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}