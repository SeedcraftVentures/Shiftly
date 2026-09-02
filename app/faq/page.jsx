import Link from 'next/link'
import Footer from '@/app/components/Footer'

export const metadata = {
  title: 'Help and FAQ · Shiftly',
  description: 'Answers to common questions about Shiftly, plus how to manage your account, data and subscription.',
}

// Public help / FAQ page. Doubles as the App Store and Play Store support URL, and
// holds the account and data deletion steps the stores require to be reachable.

const SECTIONS = [
  {
    title: 'Getting started',
    qs: [
      { q: 'What is Shiftly?', a: 'Shiftly builds staff rotas for you. You tell it your opening hours, your team and your shifts, and it works out a fair rota in seconds. Your team see it and set when they can work from their own phone.' },
      { q: 'How do I set up?', a: 'Sign up, then the setup helper asks you a few simple things: your venue name, when you open, your team, and the fewest people you need on. That is enough to build your first rota.' },
      { q: 'How does my team join?', a: 'Share your join code. Your team download the Shiftly Team app, enter the code, pick their name, and set their own availability. You do not add their phone or email by hand.' },
    ],
  },
  {
    title: 'For staff',
    qs: [
      { q: 'How do I see my shifts?', a: 'Open the Shiftly Team app. Your rota shows as soon as your manager publishes it, and you get a message when it changes.' },
      { q: 'How do I set when I can work?', a: 'In the app, set the days and times you are free. Your manager sees this when they build the rota.' },
      { q: 'How do I book time off or swap a shift?', a: 'In the app you can ask for time off or a day off, and you can swap a shift or ask a teammate to cover. Your manager gets the request and you hear back in the app.' },
    ],
  },
  {
    title: 'Plans and billing',
    qs: [
      { q: 'How much does Shiftly cost?', a: 'There are two plans. Manual is £49 a month and builds your rotas for you. Companion is £59 a month and adds an assistant you can talk to in plain words to build, cost and manage your rotas. Staff places are unlimited on both.' },
      { q: 'Is there a free trial?', a: 'Yes. You get 7 days free to try it, no card needed to start. You only pay if you carry on after the trial.' },
      { q: 'How do I cancel?', a: 'You can cancel any time from your billing settings, or email support@shiftly.so and we will sort it. There is no long contract.' },
    ],
  },
  {
    title: 'Your data and account',
    qs: [
      { q: 'How do I delete my account and data?', a: 'ACCOUNT_DELETE' },
      { q: 'Where is my data kept?', a: 'Your data is kept securely and only used to run Shiftly for you. See our Privacy Policy for the detail.' },
      { q: 'I need help with something else.', a: 'Email support@shiftly.so any time and a real person will help.' },
    ],
  },
]

function DeleteAnswer() {
  return (
    <div id="delete-account" className="space-y-3">
      <p>You can delete your Shiftly account and all its data at any time. This cannot be undone.</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><span className="font-semibold text-gray-900">In the app:</span> open your profile, choose Delete account, and confirm.</li>
        <li><span className="font-semibold text-gray-900">On the web:</span> go to <Link href="/delete-account" className="text-pink-600 hover:underline">shiftly.so/delete-account</Link>, sign in with the account you want to remove, and confirm.</li>
        <li><span className="font-semibold text-gray-900">By email:</span> write to <a href="mailto:support@shiftly.so" className="text-pink-600 hover:underline">support@shiftly.so</a> and we will delete it for you.</li>
      </ul>
      <p>Deleting removes your login, your business, teams, staff, shifts and rotas, time-off requests, notifications, and cancels any active plan.</p>
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-cal text-lg text-gray-900">Shiftly</Link>
          <a href="mailto:support@shiftly.so" className="text-sm font-semibold text-pink-600 hover:text-pink-700">Contact support</a>
        </div>
      </header>

      <main className="flex-1 px-6 py-14">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-cal tracking-tight text-gray-900 mb-3">Help and FAQ</h1>
          <p className="text-gray-600 leading-relaxed mb-12 max-w-2xl">
            Quick answers to the things people ask most. Need something else? Email{' '}
            <a href="mailto:support@shiftly.so" className="text-pink-600 hover:underline">support@shiftly.so</a> and a real person will help.
          </p>

          <div className="space-y-14">
            {SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">{s.title}</h2>
                <div className="space-y-8">
                  {s.qs.map((item) => (
                    <div key={item.q}>
                      <h3 className="text-lg font-cal text-gray-900 mb-1.5">{item.q}</h3>
                      <div className="text-gray-600 leading-relaxed">
                        {item.a === 'ACCOUNT_DELETE' ? <DeleteAnswer /> : <p>{item.a}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-gray-100 text-sm text-gray-500">
            See also our <Link href="/privacy" className="text-pink-600 hover:underline">Privacy Policy</Link> and{' '}
            <Link href="/terms" className="text-pink-600 hover:underline">Terms of Service</Link>.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
