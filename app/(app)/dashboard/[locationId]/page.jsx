'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/app/lib/constants'
import {
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  MessageBubbleIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@/app/lib/icons'
import PageHeader from '@/app/components/layout/PageHeader'
import Button from '@/app/components/ui/Button'
import Badge from '@/app/components/ui/Badge'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)

  // STRIPE DISABLED — skip subscription check during development
  // commenting this out cause not checking user type here anymore
  // useEffect(() => {
  //   if (isCheckingUserType) return
  //   setIsCheckingSubscription(false)
  // }, [isCheckingUserType])

  // Fetch rotas with React Query - cached for 5 mins, instant on return
  const { data: rotas = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.rotas,
    queryFn: async () => {
      const response = await fetch('/api/rotas')
      if (!response.ok) throw new Error('Failed to fetch rotas')
      return response.json()
    },
    enabled: !isCheckingSubscription
  })

  // Fetch pending requests count
  const { data: requests = [] } = useQuery({
    queryKey: QUERY_KEYS.requests,
    queryFn: async () => {
      const response = await fetch('/api/requests')
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    },
    enabled: !isCheckingSubscription
  })

  const pendingRequestsCount = useMemo(() => {
    return requests.filter(r => r.status === 'pending').length
  }, [requests])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (rotaId) => {
      const response = await fetch(`/api/rotas/${rotaId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete rota')
      return rotaId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rotas })
    },
    onError: (error) => {
      console.error('Error deleting rota:', error)
      alert('Failed to delete rota')
    }
  })

  // Calculate stats from rotas data
  const stats = useMemo(() => {
    const approvedRotas = rotas.filter(r => r.approved)
    const totalWeeks = approvedRotas.reduce((sum, r) => sum + (r.week_count || 1), 0)
    const timeSaved = approvedRotas.length * 2.5
    
    return {
      timeSaved: timeSaved.toFixed(1),
      weeksApproved: totalWeeks
    }
  }, [rotas])

  const handleDeleteRota = async (rotaId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this rota? This cannot be undone.')) return
    deleteMutation.mutate(rotaId)
  }

  const formatWeekBeginning = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const formatFullDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleRotaClick = (rotaId) => {
    router.push(`/dashboard/generate?rota=${rotaId}`)
  }

  // Show loading while checking user type
  if (isCheckingSubscription) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-shiftly-pink rounded-full animate-spin mx-auto mb-4"></div>
          <p className="body-text">Loading your dashboard...</p>
        </div>
      </main>
    )
  }

  const firstName = user?.firstName || 'there'
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const approvedRotas = rotas.filter(r => r.approved)
  
  const upcomingRotas = approvedRotas
    .filter(r => {
      if (!r.end_date) return true
      const endDate = new Date(r.end_date)
      return endDate >= today
    })
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
  
  const pastRotas = approvedRotas
    .filter(r => {
      if (!r.end_date) return false
      const endDate = new Date(r.end_date)
      return endDate < today
    })
    .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

  const draftRotas = rotas.filter(r => !r.approved)

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Welcome Header */}
      <PageHeader 
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what's happening with your schedules"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-shiftly-pink/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-shiftly-pink-light rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.timeSaved}h</p>
          <p className="caption">Time Saved</p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-shiftly-pink/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-shiftly-pink-light rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
            <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.weeksApproved}</p>
          <p className="caption">Weeks Approved</p>
        </div>

        <Link 
          href="/dashboard/requests"
          className={`bg-white rounded-xl sm:rounded-2xl border p-3 sm:p-6 text-center hover:shadow-lg hover:shadow-shiftly-pink/10 transition-colors transition-shadow ${
            pendingRequestsCount > 0 ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'
          }`}
        >
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 ${
            pendingRequestsCount > 0 ? 'bg-amber-100' : 'bg-pink-100'
          }`}>
            <MessageBubbleIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${pendingRequestsCount > 0 ? 'text-amber-600' : 'text-pink-600'}`} />
          </div>
          <p className="text-xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">{pendingRequestsCount}</p>
          <p className="caption">
            {pendingRequestsCount === 1 ? 'Request' : 'Requests'}
            {pendingRequestsCount > 0 && <span className="text-amber-600 ml-1">●</span>}
          </p>
        </Link>
      </div>

      {/* Upcoming Rotas */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="heading-section">Upcoming Rotas</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/dashboard/generate')}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              New Rota
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-shiftly-pink rounded-full animate-spin"></div>
          </div>
        ) : upcomingRotas.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <p className="body-text font-medium mb-1">No upcoming rotas</p>
            <p className="body-small mb-4">Create and approve a rota to see it here</p>
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard/generate')}
            >
              Build Your First Rota
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingRotas.slice(0, 5).map((rota) => (
              <div
                key={rota.id}
                className="flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleRotaClick(rota.id)}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 text-left"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-shiftly-pink-light rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="body-text font-medium truncate">
                      {rota.rota_name || rota.name || 'Untitled Rota'}
                    </p>
                    <p className="body-small">
                      w/c {formatWeekBeginning(rota.start_date)} · {rota.week_count || 1} week{(rota.week_count || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                
                <div className="flex items-center gap-2 pr-4 sm:pr-6">
                  <button
                    onClick={(e) => handleDeleteRota(rota.id, e)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                    className="btn-icon p-2 text-gray-400"
                    title="Delete rota"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                    ) : (
                      <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Rotas */}
      <PastRotasSection 
        pastRotas={pastRotas}
        onRotaClick={handleRotaClick}
        onDelete={handleDeleteRota}
        deleteMutation={deleteMutation}
        formatFullDate={formatFullDate}
      />

      {/* Draft Rotas */}
      {draftRotas.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="heading-section">Drafts</h2>
              <Badge variant="warning">{draftRotas.length}</Badge>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {draftRotas.map((rota) => (
              <div
                key={rota.id}
                className="flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <button
                  onClick={() => handleRotaClick(rota.id)}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 text-left"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="body-text font-medium text-gray-700 truncate">
                      {rota.rota_name || rota.name || 'Untitled Draft'}
                    </p>
                    <p className="body-small">
                      w/c {formatWeekBeginning(rota.start_date)} · {rota.week_count || 1} week{(rota.week_count || 1) > 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                
                <div className="flex items-center gap-2 pr-4 sm:pr-6">
                  <button
                    onClick={(e) => handleDeleteRota(rota.id, e)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                    className="btn-icon p-2 text-gray-400"
                    title="Delete draft"
                  >
                    {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                    ) : (
                      <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 sm:mt-6 flex justify-center">
        <Button 
          variant="link"
          onClick={() => router.push('/dashboard/workspace')}
        >
          Manage Staff & Shifts →
        </Button>
      </div>

    </main>
  )
}

function PastRotasSection({ pastRotas, onRotaClick, onDelete, deleteMutation, formatFullDate }) {
  const [showPastRotas, setShowPastRotas] = useState(false)
  
  if (pastRotas.length === 0) return null
  
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden mb-4">
      <button
        onClick={() => setShowPastRotas(!showPastRotas)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="heading-section">Past Rotas</h2>
          <Badge variant="default">{pastRotas.length}</Badge>
        </div>
        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${showPastRotas ? 'rotate-180' : ''}`} />
      </button>

      {showPastRotas && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {pastRotas.map((rota) => (
            <div
              key={rota.id}
              className="flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <button
                onClick={() => onRotaClick(rota.id)}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 text-left"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="body-text font-medium text-gray-700 truncate">
                    {rota.rota_name || rota.name || 'Untitled Rota'}
                  </p>
                  <p className="body-small">
                    {formatFullDate(rota.start_date)} - {formatFullDate(rota.end_date)}
                  </p>
                </div>
              </button>
              
              <div className="flex items-center gap-2 pr-4 sm:pr-6">
                <button
                  onClick={(e) => onDelete(rota.id, e)}
                  disabled={deleteMutation.isPending && deleteMutation.variables === rota.id}
                  className="btn-icon p-2 text-gray-400"
                  title="Delete rota"
                >
                  {deleteMutation.isPending && deleteMutation.variables === rota.id ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                  ) : (
                    <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
                <ChevronRightIcon className="w-5 h-5 text-gray-400 hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}