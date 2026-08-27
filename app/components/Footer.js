'use client'

import Link from 'next/link'
import ShiftlyLogo from '@/app/components/ShiftlyLogo'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 pt-16 pb-10 px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* ── Top grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16 pb-12 border-b border-gray-800">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <ShiftlyLogo variant="white" size="md" showPillbox={false} />
            <p className="text-gray-500 text-sm mt-3 mb-5 leading-relaxed max-w-[18rem]">
              Fair rotas, generated in seconds.
            </p>

            {/* Identity pill */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border border-pink-500/40 bg-pink-500/5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FF1F7D' }} />
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: '#FF1F7D' }}>
                Scheduling is maths, not AI
              </span>
            </div>

            {/* Socials */}
            <div className="flex gap-2.5">
              {/* TODO: replace with your actual Facebook page URL */}
              <a
                href="https://www.facebook.com/profile.php?id=61576527885937"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Shiftly on Facebook"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: '#FF1F7D' }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              {/* TODO: replace with your actual Instagram page URL */}
              <a
                href="https://www.instagram.com/shiftly.so/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Shiftly on Instagram"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: '#FF1F7D' }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Product</p>
            <ul className="space-y-3">
              <li><Link href="/features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/features#employee-app" className="text-sm text-gray-400 hover:text-white transition-colors">Employee App</Link></li>
              <li>
                <span className="text-sm text-gray-500 inline-flex items-center gap-2">
                  Changelog
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-gray-800 text-gray-500">SOON</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Company</p>
            <ul className="space-y-3">
              <li>
                <a href="mailto:shiftly@seedcraft.co" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <span className="text-sm text-gray-500 inline-flex items-center gap-2">
                  Affiliates
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-gray-800 text-gray-500">SOON</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Legal</p>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* ── Bottom strip ── */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <p className="text-gray-500">&copy; 2026 Shiftly · A Seedcraft Ventures product.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}