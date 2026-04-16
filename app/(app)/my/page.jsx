export default function MyHomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-shiftly-pink-light rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-shiftly-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your schedule</h1>
        <p className="text-gray-600">
          The staff app is coming soon. You&apos;ll see your upcoming shifts and requests here.
        </p>
      </div>
    </div>
  )
}