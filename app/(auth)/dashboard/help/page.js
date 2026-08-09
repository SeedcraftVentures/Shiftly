'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/app/components/PageHeader'

const FAQ_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'How do I set up my first rota?',
        answer: "Start in your Workspace Settings to configure shift lengths and business hours. Then create Day Templates to define your shift patterns, and assign them to days in the Weekly Schedule. Hit Save & Sync to lock it in. Next, add your staff in the Staff & Shifts tab with their contracted hours and availability. Finally, go to the Rota Builder, check the template preview, and hit Generate. Shiftly will create a fair, balanced rota in seconds."
      },
      {
        question: 'What are shift patterns and how do they work?',
        answer: "Shift patterns are organised as Day Templates in your Workspace. Each template is a card you can Edit, Rename, or Delete. Inside the editor, you drag and resize shift blocks on a timeline to define start times, durations, and headcount. You then assign templates to days of the week in the Weekly Schedule tab and hit Save & Sync. Every time you generate a rota, Shiftly uses these patterns to assign staff fairly."
      },
      {
        question: 'How do I invite my staff to view their schedules?',
        answer: "Go to your Workspace, open the Staff & Shifts tab, and expand a staff card. Click the invite button next to any staff member who has an email address on file. They'll receive a link to create their account. Once connected, they can view their shifts, submit availability, and request time off, all from their phone."
      },
      {
        question: "What does 'set once, use forever' mean?",
        answer: "It means the hard work is upfront. Once you've added your staff, shifts, and rules, generating future rotas takes seconds. You won't need to re-enter information each week. Shiftly remembers everything and applies it automatically."
      },
    ]
  },
  {
    title: 'Scheduling & Rotas',
    items: [
      {
        question: 'Can I manually edit a rota after generating it?',
        answer: "Absolutely. After generating a rota, click any empty cell to add a shift manually, or click an existing shift to edit, reassign to a different staff member, or delete it. The rota builder is designed for AI-assisted generation with full manual control afterwards."
      },
      {
        question: "What happens when I approve a rota?",
        answer: "Approved rotas are pushed straight to your employees' app. They'll receive a notification and can immediately see their upcoming shifts. Draft rotas are only visible to you until you approve them."
      },
      {
        question: "How does Shiftly ensure fair scheduling?",
        answer: "Shiftly uses a constraint satisfaction algorithm (not just AI guessing) to mathematically guarantee fairness. It enforces your rules, like no clopening shifts, even weekend distribution, and maximum consecutive days, while ensuring contracted hours are met. Staff are rotated between weeks so nobody gets stuck with the same pattern."
      },
      {
        question: "Can I schedule across multiple teams?",
        answer: "Yes. You can create separate teams within your workspace. For example, Bar, Kitchen, and Front of House for a restaurant. Each team has its own staff, shifts, and rules, but they all share your business's opening hours. Generate rotas independently for each team."
      },
      {
        question: "What if the scheduler can't find a valid rota?",
        answer: "Shiftly runs pre-generation checks before sending anything to the scheduler. It verifies your templates are configured, you have enough staff, coverage is above 80%, and keyholders are available for opening and closing shifts. If something is missing, you'll see a specific error with a direct link to fix it (e.g. 'Go to Staff & Shifts'). If the scheduler itself can't find a solution, Shiftly shows diagnostics with suggestions."
      },
    ]
  },
  {
    title: 'Staff & Availability',
    items: [
      {
        question: "How do staff submit their availability?",
        answer: "Staff set their availability using a shift-based matrix that matches your actual template shifts. Instead of just picking whole days, they toggle individual shift time slots (e.g. Monday morning, Tuesday evening). This gives you precise control over who is available for each shift. Availability is set through the employee app or by managers in the Staff & Shifts tab. The coverage gauge shows at a glance whether you have enough available staff, including keyholder warnings for opening and closing shifts."
      },
      {
        question: "How do time-off requests work?",
        answer: "Staff submit time-off requests through their app, specifying the dates and a reason. These appear in your Inbox for approval or rejection. Approved time off is automatically excluded from future rota generation, so you'll never accidentally schedule someone who's on holiday."
      },
      {
        question: "Can I import my existing staff list?",
        answer: "Yes. During setup (or anytime in your Workspace), you can import staff via CSV. If you have your team in Excel or Google Sheets, just export it as a CSV file and upload it. Shiftly will parse names, hours, and roles automatically."
      },
    ]
  },
  {
    title: 'Payroll & Reports',
    items: [
      {
        question: "Is pay information secure?",
        answer: "Yes. The Payroll section is password-protected separately from your main login. Even if someone has access to your Shiftly account, they can't see salary information without the payroll password. Only you decide who has access."
      },
      {
        question: "Can I export data for my accountant?",
        answer: "Yes. The Reports section lets you export hours worked, costs, and payroll data as CSV files that can be opened in Excel or imported into accounting software like Xero, QuickBooks, or Sage."
      },
      {
        question: "How are weekly costs calculated?",
        answer: "Shiftly calculates costs based on each staff member's hourly rate or annual salary. Regular hours are charged at the base rate, and overtime (hours above contracted) is charged at 1.5x the base rate. You can see per-staff breakdowns showing regular hours, overtime hours, rate, and total cost in the Reports section. The Labour Cost stat card shows the weekly total."
      },
    ]
  },
  {
    title: 'Account & Billing',
    items: [
      {
        question: "How does the free trial work?",
        answer: "You get 14 days of full access to everything, no credit card required to start. During the trial you can set up your team, generate rotas, and invite staff. If you love it, subscribe to keep going. If not, no hard feelings."
      },
      {
        question: "How much does Shiftly cost?",
        answer: "Shiftly is \u00a349/month for your entire business, regardless of how many staff or teams you have. No per-user fees, no hidden costs, no feature tiers. One price, everything included."
      },
      {
        question: "Can I install Shiftly on my phone?",
        answer: "Yes! Shiftly works as a web app you can install to your home screen, no app store needed. On iPhone, tap Share then 'Add to Home Screen'. On Android, look for the install prompt in your browser. Share this tip with your staff too."
      },
    ]
  },
]

export default function HelpPage() {
  const router = useRouter()
  const [openItems, setOpenItems] = useState({})

  const toggleItem = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleRetakeTour = () => {
    // Re-show the setup assistant's build guidance on the rota builder.
    localStorage.removeItem('shiftly_setup_done')
    router.push('/dashboard/generate?setup=1')
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <PageHeader
        title="Help Centre"
        subtitle="Everything you need to know about using Shiftly"
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {/* Retake Tour Card */}
        <button
          onClick={handleRetakeTour}
          className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:shadow-lg hover:shadow-pink-500/10 hover:border-pink-200 transition-all group"
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: '#FFF0F5' }}>
            <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 mb-1 group-hover:text-pink-600 transition-colors">Show the setup guide</p>
          <p className="text-sm text-gray-500">Reopen the assistant that walks you through building and publishing a rota</p>
        </button>

        {/* Contact Support Card */}
        <a
          href="mailto:support@shiftly.so"
          className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:shadow-lg hover:shadow-pink-500/10 hover:border-pink-200 transition-all group"
        >
          <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-900 mb-1 group-hover:text-pink-600 transition-colors">Contact Support</p>
          <p className="text-sm text-gray-500">Got a question we haven't covered? Drop us an email</p>
        </a>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-10">
        {FAQ_SECTIONS.map((section, sIdx) => (
          <div key={sIdx}>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">{section.title}</h3>
            <div className="space-y-3">
              {section.items.map((item, iIdx) => {
                const key = `${sIdx}-${iIdx}`
                const isOpen = openItems[key]
                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl border border-pink-100 overflow-hidden transition-all hover:border-pink-200"
                  >
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                      <svg
                        className={`w-5 h-5 text-pink-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 -mt-1">
                        <p className="text-gray-600 text-[15px] leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </main>
  )
}